const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./db');
const { getNetBalances, simplifyDebts } = require('./balances');
const {
  hashPassword,
  verifyPassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} = require('./auth');

const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function isGroupMember(groupId, userId) {
  return Boolean(
    db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId)
  );
}

function requireGroupMember(req, res, next) {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  if (!isGroupMember(group.id, req.user.id)) {
    return res.status(403).json({ error: 'not a member of this group' });
  }
  req.group = group;
  next();
}

// ---- Auth ----

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT 1 FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'an account with that email already exists' });

  const passwordHash = hashPassword(password);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name.trim(), normalizedEmail, passwordHash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json(publicUser(user));
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid email or password' });
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json(publicUser(user));
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  res.json(publicUser(user));
});

// Everything below requires a logged-in user.
app.use('/api', requireAuth);

// ---- Users (for adding friends to groups) ----

app.get('/api/users', (req, res) => {
  const search = (req.query.email || '').trim().toLowerCase();
  if (!search) return res.json([]);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(search);
  res.json(user ? [publicUser(user)] : []);
});

// ---- Groups ----

app.get('/api/groups', (req, res) => {
  const groups = db
    .prepare(
      `SELECT g.* FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = ? ORDER BY g.created_at DESC`
    )
    .all(req.user.id);
  res.json(groups);
});

app.post('/api/groups', (req, res) => {
  const { name, memberIds } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const members = new Set(Array.isArray(memberIds) ? memberIds : []);
  members.add(req.user.id);

  const result = db.prepare('INSERT INTO groups (name) VALUES (?)').run(name.trim());
  const groupId = result.lastInsertRowid;
  const insertMember = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
  for (const userId of members) {
    insertMember.run(groupId, userId);
  }

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  res.status(201).json(group);
});

app.get('/api/groups/:id', requireGroupMember, (req, res) => {
  const members = db
    .prepare(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = ? ORDER BY u.name`
    )
    .all(req.params.id);

  res.json({ ...req.group, members });
});

app.post('/api/groups/:id/members', requireGroupMember, (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'email is required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) return res.status(404).json({ error: 'no account found with that email' });

  db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)').run(
    req.params.id,
    user.id
  );
  res.status(201).json(publicUser(user));
});

// ---- Expenses ----

app.get('/api/groups/:id/expenses', requireGroupMember, (req, res) => {
  const expenses = db
    .prepare(
      `SELECT e.*, u.name AS paidByName FROM expenses e
       JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = ? ORDER BY e.created_at DESC`
    )
    .all(req.params.id);

  const splitStmt = db.prepare(
    `SELECT es.user_id AS userId, u.name, es.share_amount AS amount
     FROM expense_splits es JOIN users u ON u.id = es.user_id
     WHERE es.expense_id = ?`
  );
  const withSplits = expenses.map((e) => ({ ...e, splits: splitStmt.all(e.id) }));

  res.json(withSplits);
});

function validateExpenseBody(body) {
  const { description, amount, paidBy, splits } = body;
  if (!description || !description.trim()) return 'description is required';
  const total = Number(amount);
  if (!Number.isFinite(total) || total <= 0) return 'amount must be a positive number';
  if (!paidBy) return 'paidBy is required';
  if (!Array.isArray(splits) || splits.length === 0) return 'splits must be a non-empty array';
  const splitTotal = splits.reduce((sum, s) => sum + Number(s.amount), 0);
  if (Math.abs(splitTotal - total) > 0.02) return 'split amounts must add up to the total amount';
  return null;
}

app.post('/api/groups/:id/expenses', requireGroupMember, (req, res) => {
  const groupId = req.params.id;
  const error = validateExpenseBody(req.body);
  if (error) return res.status(400).json({ error });

  const { description, amount, paidBy, splits } = req.body;
  const insertExpense = db.prepare(
    'INSERT INTO expenses (group_id, description, amount, paid_by) VALUES (?, ?, ?, ?)'
  );
  const insertSplit = db.prepare(
    'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)'
  );

  const expenseId = db.transaction(() => {
    const result = insertExpense.run(groupId, description.trim(), Number(amount), paidBy);
    for (const s of splits) {
      insertSplit.run(result.lastInsertRowid, s.userId, Number(s.amount));
    }
    return result.lastInsertRowid;
  })();

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  res.status(201).json(expense);
});

function requireExpenseInGroup(req, res, next) {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'expense not found' });
  if (!isGroupMember(expense.group_id, req.user.id)) {
    return res.status(403).json({ error: 'not a member of this group' });
  }
  req.expense = expense;
  next();
}

app.put('/api/expenses/:id', requireExpenseInGroup, (req, res) => {
  const error = validateExpenseBody(req.body);
  if (error) return res.status(400).json({ error });

  const { description, amount, paidBy, splits } = req.body;
  const updateExpense = db.prepare(
    `UPDATE expenses SET description = ?, amount = ?, paid_by = ?, updated_at = datetime('now') WHERE id = ?`
  );
  const deleteSplits = db.prepare('DELETE FROM expense_splits WHERE expense_id = ?');
  const insertSplit = db.prepare(
    'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)'
  );

  db.transaction(() => {
    updateExpense.run(description.trim(), Number(amount), paidBy, req.params.id);
    deleteSplits.run(req.params.id);
    for (const s of splits) {
      insertSplit.run(req.params.id, s.userId, Number(s.amount));
    }
  })();

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  res.json(expense);
});

app.delete('/api/expenses/:id', requireExpenseInGroup, (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ---- Payments (settle up) ----

app.get('/api/groups/:id/payments', requireGroupMember, (req, res) => {
  const payments = db
    .prepare(
      `SELECT p.*, fu.name AS fromName, tu.name AS toName
       FROM payments p
       JOIN users fu ON fu.id = p.from_user
       JOIN users tu ON tu.id = p.to_user
       WHERE p.group_id = ? ORDER BY p.created_at DESC`
    )
    .all(req.params.id);
  res.json(payments);
});

app.post('/api/groups/:id/payments', requireGroupMember, (req, res) => {
  const { fromUser, toUser, amount, note } = req.body;
  const total = Number(amount);

  if (!fromUser || !toUser) return res.status(400).json({ error: 'fromUser and toUser are required' });
  if (fromUser === toUser) return res.status(400).json({ error: 'fromUser and toUser must differ' });
  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  if (!isGroupMember(req.params.id, fromUser) || !isGroupMember(req.params.id, toUser)) {
    return res.status(400).json({ error: 'both users must be members of this group' });
  }

  const result = db
    .prepare('INSERT INTO payments (group_id, from_user, to_user, amount, note) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, fromUser, toUser, total, note?.trim() || null);

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(payment);
});

// ---- Balances ----

app.get('/api/groups/:id/balances', requireGroupMember, (req, res) => {
  const netBalances = getNetBalances(req.params.id);
  const settlements = simplifyDebts(netBalances);
  res.json({ netBalances, settlements });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

module.exports = app;

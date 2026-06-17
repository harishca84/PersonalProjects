const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { pool, query, queryOne } = require('./db');
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
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email };
}

async function isGroupMember(groupId, userId) {
  const row = await queryOne(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return Boolean(row);
}

function requireGroupMember(req, res, next) {
  queryOne('SELECT * FROM groups WHERE id = $1', [req.params.id])
    .then(async (group) => {
      if (!group) return res.status(404).json({ error: 'group not found' });
      if (!(await isGroupMember(group.id, req.user.id))) {
        return res.status(403).json({ error: 'not a member of this group' });
      }
      req.group = group;
      next();
    })
    .catch(next);
}

// ---- Auth ----

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await queryOne('SELECT 1 FROM users WHERE email = $1', [normalizedEmail]);
  if (existing) return res.status(409).json({ error: 'an account with that email already exists' });

  const passwordHash = hashPassword(password);
  const [user] = await query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
    [name.trim(), normalizedEmail, passwordHash]
  );

  setAuthCookie(res, signToken(user));
  res.status(201).json(publicUser(user));
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = await queryOne('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid email or password' });
  }

  setAuthCookie(res, signToken(user));
  res.json(publicUser(user));
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  res.json(publicUser(user));
});

// All routes below require a valid session.
app.use('/api', requireAuth);

// ---- Users ----

app.get('/api/users', async (req, res) => {
  const search = (req.query.email || '').trim().toLowerCase();
  if (!search) return res.json([]);
  const user = await queryOne('SELECT * FROM users WHERE email = $1', [search]);
  res.json(user ? [publicUser(user)] : []);
});

// ---- Groups ----

app.get('/api/groups', async (req, res) => {
  const groups = await query(
    `SELECT g.* FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1 ORDER BY g.created_at DESC`,
    [req.user.id]
  );
  res.json(groups);
});

app.post('/api/groups', async (req, res) => {
  const { name, memberIds } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const members = new Set(Array.isArray(memberIds) ? memberIds.map(Number) : []);
  members.add(req.user.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO groups (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    const group = rows[0];
    for (const userId of members) {
      await client.query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
        [group.id, userId]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(group);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

app.get('/api/groups/:id', requireGroupMember, async (req, res) => {
  const members = await query(
    `SELECT u.id, u.name, u.email FROM users u
     JOIN group_members gm ON gm.user_id = u.id
     WHERE gm.group_id = $1 ORDER BY u.name`,
    [req.params.id]
  );
  res.json({ ...req.group, members });
});

app.post('/api/groups/:id/members', requireGroupMember, async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'email is required' });

  const user = await queryOne('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
  if (!user) return res.status(404).json({ error: 'no account found with that email' });

  await query(
    'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.params.id, user.id]
  );
  res.status(201).json(publicUser(user));
});

// ---- Expenses ----

app.get('/api/groups/:id/expenses', requireGroupMember, async (req, res) => {
  const expenses = await query(
    `SELECT e.*, u.name AS "paidByName" FROM expenses e
     JOIN users u ON u.id = e.paid_by
     WHERE e.group_id = $1 ORDER BY e.created_at DESC`,
    [req.params.id]
  );

  const withSplits = await Promise.all(
    expenses.map(async (e) => {
      const splits = await query(
        `SELECT es.user_id AS "userId", u.name, es.share_amount AS amount
         FROM expense_splits es JOIN users u ON u.id = es.user_id
         WHERE es.expense_id = $1`,
        [e.id]
      );
      return { ...e, splits };
    })
  );
  res.json(withSplits);
});

function validateExpenseBody(body) {
  const { description, amount, paidBy, splits } = body;
  if (!description?.trim()) return 'description is required';
  const total = Number(amount);
  if (!Number.isFinite(total) || total <= 0) return 'amount must be a positive number';
  if (!paidBy) return 'paidBy is required';
  if (!Array.isArray(splits) || splits.length === 0) return 'splits must be a non-empty array';
  const splitTotal = splits.reduce((sum, s) => sum + Number(s.amount), 0);
  if (Math.abs(splitTotal - total) > 0.02) return 'split amounts must add up to the total amount';
  return null;
}

app.post('/api/groups/:id/expenses', requireGroupMember, async (req, res) => {
  const error = validateExpenseBody(req.body);
  if (error) return res.status(400).json({ error });

  const { description, amount, paidBy, splits } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO expenses (group_id, description, amount, paid_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, description.trim(), Number(amount), paidBy]
    );
    const expense = rows[0];
    for (const s of splits) {
      await client.query(
        'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES ($1, $2, $3)',
        [expense.id, s.userId, Number(s.amount)]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(expense);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

async function requireExpenseInGroup(req, res, next) {
  const expense = await queryOne('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
  if (!expense) return res.status(404).json({ error: 'expense not found' });
  if (!(await isGroupMember(expense.group_id, req.user.id))) {
    return res.status(403).json({ error: 'not a member of this group' });
  }
  req.expense = expense;
  next();
}

app.put('/api/expenses/:id', requireExpenseInGroup, async (req, res) => {
  const error = validateExpenseBody(req.body);
  if (error) return res.status(400).json({ error });

  const { description, amount, paidBy, splits } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE expenses SET description=$1, amount=$2, paid_by=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [description.trim(), Number(amount), paidBy, req.params.id]
    );
    await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [req.params.id]);
    for (const s of splits) {
      await client.query(
        'INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES ($1, $2, $3)',
        [req.params.id, s.userId, Number(s.amount)]
      );
    }
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

app.delete('/api/expenses/:id', requireExpenseInGroup, async (req, res) => {
  await query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

// ---- Payments ----

app.get('/api/groups/:id/payments', requireGroupMember, async (req, res) => {
  const payments = await query(
    `SELECT p.*, fu.name AS "fromName", tu.name AS "toName"
     FROM payments p
     JOIN users fu ON fu.id = p.from_user
     JOIN users tu ON tu.id = p.to_user
     WHERE p.group_id = $1 ORDER BY p.created_at DESC`,
    [req.params.id]
  );
  res.json(payments);
});

app.post('/api/groups/:id/payments', requireGroupMember, async (req, res) => {
  const { fromUser, toUser, amount, note } = req.body;
  const total = Number(amount);

  if (!fromUser || !toUser) return res.status(400).json({ error: 'fromUser and toUser are required' });
  if (Number(fromUser) === Number(toUser)) return res.status(400).json({ error: 'fromUser and toUser must differ' });
  if (!Number.isFinite(total) || total <= 0) return res.status(400).json({ error: 'amount must be a positive number' });
  if (!(await isGroupMember(req.params.id, fromUser)) || !(await isGroupMember(req.params.id, toUser))) {
    return res.status(400).json({ error: 'both users must be members of this group' });
  }

  const [payment] = await query(
    'INSERT INTO payments (group_id, from_user, to_user, amount, note) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.params.id, fromUser, toUser, total, note?.trim() || null]
  );
  res.status(201).json(payment);
});

// ---- Balances ----

app.get('/api/groups/:id/balances', requireGroupMember, async (req, res) => {
  const netBalances = await getNetBalances(req.params.id);
  const settlements = simplifyDebts(netBalances);
  res.json({ netBalances, settlements });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

module.exports = app;

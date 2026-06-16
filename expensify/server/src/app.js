const express = require('express');
const cors = require('cors');
const db = require('./db');
const { getNetBalances, simplifyDebts } = require('./balances');

const app = express();
app.use(cors());
app.use(express.json());

// ---- People ----

app.get('/api/people', (req, res) => {
  const people = db.prepare('SELECT * FROM people ORDER BY name').all();
  res.json(people);
});

app.post('/api/people', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const result = db.prepare('INSERT INTO people (name) VALUES (?)').run(name.trim());
    const person = db.prepare('SELECT * FROM people WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(person);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'a person with that name already exists' });
    }
    throw err;
  }
});

// ---- Groups ----

app.get('/api/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups ORDER BY created_at DESC').all();
  res.json(groups);
});

app.post('/api/groups', (req, res) => {
  const { name, memberIds } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: 'memberIds must be a non-empty array' });
  }

  const result = db.prepare('INSERT INTO groups (name) VALUES (?)').run(name.trim());
  const groupId = result.lastInsertRowid;
  const insertMember = db.prepare('INSERT INTO group_members (group_id, person_id) VALUES (?, ?)');
  for (const personId of memberIds) {
    insertMember.run(groupId, personId);
  }

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  res.status(201).json(group);
});

app.get('/api/groups/:id', (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });

  const members = db
    .prepare(
      `SELECT p.id, p.name FROM people p
       JOIN group_members gm ON gm.person_id = p.id
       WHERE gm.group_id = ? ORDER BY p.name`
    )
    .all(req.params.id);

  res.json({ ...group, members });
});

app.post('/api/groups/:id/members', (req, res) => {
  const { personId } = req.body;
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  if (!personId) return res.status(400).json({ error: 'personId is required' });

  db.prepare('INSERT OR IGNORE INTO group_members (group_id, person_id) VALUES (?, ?)').run(
    req.params.id,
    personId
  );
  res.status(204).end();
});

// ---- Expenses ----

app.get('/api/groups/:id/expenses', (req, res) => {
  const expenses = db
    .prepare(
      `SELECT e.*, p.name AS paidByName FROM expenses e
       JOIN people p ON p.id = e.paid_by
       WHERE e.group_id = ? ORDER BY e.created_at DESC`
    )
    .all(req.params.id);

  const splitStmt = db.prepare(
    `SELECT es.person_id AS personId, p.name, es.share_amount AS amount
     FROM expense_splits es JOIN people p ON p.id = es.person_id
     WHERE es.expense_id = ?`
  );
  const withSplits = expenses.map((e) => ({ ...e, splits: splitStmt.all(e.id) }));

  res.json(withSplits);
});

app.post('/api/groups/:id/expenses', (req, res) => {
  const groupId = req.params.id;
  const { description, amount, paidBy, splits } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'description is required' });
  }
  const total = Number(amount);
  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  if (!paidBy) {
    return res.status(400).json({ error: 'paidBy is required' });
  }
  if (!Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ error: 'splits must be a non-empty array' });
  }

  const splitTotal = splits.reduce((sum, s) => sum + Number(s.amount), 0);
  if (Math.abs(splitTotal - total) > 0.02) {
    return res.status(400).json({ error: 'split amounts must add up to the total amount' });
  }

  const insertExpense = db.prepare(
    'INSERT INTO expenses (group_id, description, amount, paid_by) VALUES (?, ?, ?, ?)'
  );
  const insertSplit = db.prepare(
    'INSERT INTO expense_splits (expense_id, person_id, share_amount) VALUES (?, ?, ?)'
  );

  const expenseId = db.transaction(() => {
    const result = insertExpense.run(groupId, description.trim(), total, paidBy);
    for (const s of splits) {
      insertSplit.run(result.lastInsertRowid, s.personId, Number(s.amount));
    }
    return result.lastInsertRowid;
  })();

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  res.status(201).json(expense);
});

app.delete('/api/expenses/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ---- Balances ----

app.get('/api/groups/:id/balances', (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });

  const netBalances = getNetBalances(req.params.id);
  const settlements = simplifyDebts(netBalances);
  res.json({ netBalances, settlements });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

module.exports = app;

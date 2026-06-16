const db = require('./db');

function round2(n) {
  return Math.round(n * 100) / 100;
}

function getNetBalances(groupId) {
  const members = db
    .prepare(
      `SELECT p.id, p.name FROM people p
       JOIN group_members gm ON gm.person_id = p.id
       WHERE gm.group_id = ?`
    )
    .all(groupId);

  const net = new Map(members.map((m) => [m.id, 0]));

  const paid = db
    .prepare(
      `SELECT paid_by AS personId, SUM(amount) AS total
       FROM expenses WHERE group_id = ? GROUP BY paid_by`
    )
    .all(groupId);
  for (const row of paid) {
    net.set(row.personId, (net.get(row.personId) || 0) + row.total);
  }

  const owed = db
    .prepare(
      `SELECT es.person_id AS personId, SUM(es.share_amount) AS total
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = ? GROUP BY es.person_id`
    )
    .all(groupId);
  for (const row of owed) {
    net.set(row.personId, (net.get(row.personId) || 0) - row.total);
  }

  return members.map((m) => ({
    personId: m.id,
    name: m.name,
    netBalance: round2(net.get(m.id) || 0),
  }));
}

// Greedy settlement: match largest creditor with largest debtor repeatedly.
function simplifyDebts(netBalances) {
  const creditors = [];
  const debtors = [];
  for (const { personId, name, netBalance } of netBalances) {
    if (netBalance > 0.005) creditors.push({ personId, name, amount: netBalance });
    else if (netBalance < -0.005) debtors.push({ personId, name, amount: -netBalance });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = round2(Math.min(debtor.amount, creditor.amount));

    if (amount > 0) {
      settlements.push({
        from: debtor.name,
        fromId: debtor.personId,
        to: creditor.name,
        toId: creditor.personId,
        amount,
      });
    }

    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);

    if (debtor.amount <= 0.005) i += 1;
    if (creditor.amount <= 0.005) j += 1;
  }

  return settlements;
}

module.exports = { getNetBalances, simplifyDebts };

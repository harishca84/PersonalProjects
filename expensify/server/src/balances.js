const { query } = require('./db');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

async function getNetBalances(groupId) {
  const members = await query(
    `SELECT u.id, u.name FROM users u
     JOIN group_members gm ON gm.user_id = u.id
     WHERE gm.group_id = $1`,
    [groupId]
  );

  const net = new Map(members.map((m) => [m.id, 0]));

  const paid = await query(
    `SELECT paid_by AS "userId", SUM(amount) AS total
     FROM expenses WHERE group_id = $1 GROUP BY paid_by`,
    [groupId]
  );
  for (const row of paid) {
    net.set(row.userId, (net.get(row.userId) || 0) + Number(row.total));
  }

  const owed = await query(
    `SELECT es.user_id AS "userId", SUM(es.share_amount) AS total
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = $1 GROUP BY es.user_id`,
    [groupId]
  );
  for (const row of owed) {
    net.set(row.userId, (net.get(row.userId) || 0) - Number(row.total));
  }

  const payments = await query(
    `SELECT from_user AS "fromUser", to_user AS "toUser", amount
     FROM payments WHERE group_id = $1`,
    [groupId]
  );
  for (const p of payments) {
    net.set(p.fromUser, (net.get(p.fromUser) || 0) + Number(p.amount));
    net.set(p.toUser, (net.get(p.toUser) || 0) - Number(p.amount));
  }

  return members.map((m) => ({
    userId: m.id,
    name: m.name,
    netBalance: round2(net.get(m.id) || 0),
  }));
}

function simplifyDebts(netBalances) {
  const creditors = [];
  const debtors = [];
  for (const { userId, name, netBalance } of netBalances) {
    if (netBalance > 0.005) creditors.push({ userId, name, amount: netBalance });
    else if (netBalance < -0.005) debtors.push({ userId, name, amount: -netBalance });
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
      settlements.push({ from: debtor.name, fromId: debtor.userId, to: creditor.name, toId: creditor.userId, amount });
    }

    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);
    if (debtor.amount <= 0.005) i += 1;
    if (creditor.amount <= 0.005) j += 1;
  }

  return settlements;
}

module.exports = { getNetBalances, simplifyDebts };

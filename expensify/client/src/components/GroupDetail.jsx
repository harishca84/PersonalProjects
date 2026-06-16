import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import ExpenseForm from './ExpenseForm';
import SettleUpForm from './SettleUpForm';

export default function GroupDetail({ groupId, currentUser, onBack }) {
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [balances, setBalances] = useState({ netBalances: [], settlements: [] });
  const [error, setError] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [g, exp, pay, bal] = await Promise.all([
        api.getGroup(groupId),
        api.getExpenses(groupId),
        api.getPayments(groupId),
        api.getBalances(groupId),
      ]);
      setGroup(g);
      setExpenses(exp);
      setPayments(pay);
      setBalances(bal);
    } catch (err) {
      setError(err.message);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAddExpense(expense) {
    await api.createExpense(groupId, expense);
    await refresh();
  }

  async function handleUpdateExpense(expense) {
    await api.updateExpense(editingExpenseId, expense);
    setEditingExpenseId(null);
    await refresh();
  }

  async function handleDeleteExpense(id) {
    await api.deleteExpense(id);
    await refresh();
  }

  async function handleSettle(payment) {
    await api.createPayment(groupId, payment);
    await refresh();
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setError('');
    if (!memberEmail.trim()) return;
    try {
      await api.addMember(groupId, memberEmail.trim());
      setMemberEmail('');
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!group) return <div className="page">Loading...</div>;

  const editingExpense = expenses.find((e) => e.id === editingExpenseId);

  return (
    <div className="page">
      <button className="link" onClick={onBack}>
        &larr; Back to groups
      </button>
      <h1>{group.name}</h1>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Members</h2>
        <ul className="people-list">
          {group.members.map((m) => (
            <li key={m.id}>
              {m.name} <span className="muted">({m.email})</span>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddMember} className="inline-form">
          <input
            type="email"
            placeholder="Add friend by email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
          />
          <button type="submit">Add</button>
        </form>
      </section>

      <section className="card">
        <h2>Balances</h2>
        <ul className="balances-list">
          {balances.netBalances.map((b) => (
            <li key={b.userId} className={b.netBalance >= 0 ? 'positive' : 'negative'}>
              {b.name}: {b.netBalance >= 0 ? '+' : ''}
              {b.netBalance.toFixed(2)}
            </li>
          ))}
        </ul>
        <h3>Suggested settlements</h3>
        {balances.settlements.length === 0 && <p>Everyone is settled up!</p>}
        <ul>
          {balances.settlements.map((s, idx) => (
            <li key={idx}>
              {s.from} owes {s.to} ${s.amount.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>

      <SettleUpForm members={group.members} currentUserId={currentUser.id} onSettle={handleSettle} />

      {payments.length > 0 && (
        <section className="card">
          <h2>Payment history</h2>
          <ul className="expense-list">
            {payments.map((p) => (
              <li key={p.id}>
                <div>
                  {p.fromName} paid {p.toName} ${p.amount.toFixed(2)}
                  {p.note && <div className="splits">{p.note}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editingExpense ? (
        <ExpenseForm
          members={group.members}
          initialExpense={editingExpense}
          onSubmit={handleUpdateExpense}
          onCancel={() => setEditingExpenseId(null)}
        />
      ) : (
        <ExpenseForm members={group.members} onSubmit={handleAddExpense} />
      )}

      <section className="card">
        <h2>Expenses</h2>
        {expenses.length === 0 && <p>No expenses yet.</p>}
        <ul className="expense-list">
          {expenses.map((e) => (
            <li key={e.id}>
              <div>
                <strong>{e.description}</strong> — ${e.amount.toFixed(2)} paid by {e.paidByName}
                <div className="splits">
                  {e.splits.map((s) => `${s.name}: $${s.amount.toFixed(2)}`).join(', ')}
                </div>
              </div>
              <div className="expense-actions">
                <button className="link" onClick={() => setEditingExpenseId(e.id)}>
                  Edit
                </button>
                <button className="link" onClick={() => handleDeleteExpense(e.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

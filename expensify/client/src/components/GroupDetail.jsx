import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import ExpenseForm from './ExpenseForm';

export default function GroupDetail({ groupId, allPeople, onBack }) {
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({ netBalances: [], settlements: [] });
  const [error, setError] = useState('');
  const [memberToAdd, setMemberToAdd] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [g, exp, bal] = await Promise.all([
        api.getGroup(groupId),
        api.getExpenses(groupId),
        api.getBalances(groupId),
      ]);
      setGroup(g);
      setExpenses(exp);
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

  async function handleDeleteExpense(id) {
    await api.deleteExpense(id);
    await refresh();
  }

  async function handleAddMember(personId) {
    await api.addMember(groupId, personId);
    await refresh();
  }

  if (!group) return <div className="page">Loading...</div>;

  const nonMembers = allPeople.filter((p) => !group.members.some((m) => m.id === p.id));

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
            <li key={m.id}>{m.name}</li>
          ))}
        </ul>
        {nonMembers.length > 0 && (
          <div className="inline-form">
            <select value={memberToAdd} onChange={(e) => setMemberToAdd(e.target.value)}>
              <option value="" disabled>
                Add existing friend...
              </option>
              {nonMembers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (memberToAdd) {
                  handleAddMember(Number(memberToAdd));
                  setMemberToAdd('');
                }
              }}
            >
              Add
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Balances</h2>
        <ul className="balances-list">
          {balances.netBalances.map((b) => (
            <li key={b.personId} className={b.netBalance >= 0 ? 'positive' : 'negative'}>
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

      <ExpenseForm members={group.members} onAddExpense={handleAddExpense} />

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
              <button className="link" onClick={() => handleDeleteExpense(e.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

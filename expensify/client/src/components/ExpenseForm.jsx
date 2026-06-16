import { useState } from 'react';

export default function ExpenseForm({ members, onAddExpense }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(members[0]?.id ?? '');
  const [splitWith, setSplitWith] = useState(members.map((m) => m.id));
  const [error, setError] = useState('');

  function toggleSplit(personId) {
    setSplitWith((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const total = Number(amount);
    if (!description.trim() || !Number.isFinite(total) || total <= 0 || !paidBy) {
      setError('description, amount, and payer are required');
      return;
    }
    if (splitWith.length === 0) {
      setError('select at least one person to split with');
      return;
    }

    const share = Math.round((total / splitWith.length) * 100) / 100;
    const splits = splitWith.map((personId, idx) => ({
      personId,
      // give any rounding remainder to the last split
      amount: idx === splitWith.length - 1 ? Math.round((total - share * (splitWith.length - 1)) * 100) / 100 : share,
    }));

    try {
      await onAddExpense({ description: description.trim(), amount: total, paidBy: Number(paidBy), splits });
      setDescription('');
      setAmount('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Add expense</h2>
      <input
        placeholder="Description (e.g. Dinner)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <label>
        Paid by
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <div className="checkbox-list">
        <span>Split equally between:</span>
        {members.map((m) => (
          <label key={m.id}>
            <input type="checkbox" checked={splitWith.includes(m.id)} onChange={() => toggleSplit(m.id)} />
            {m.name}
          </label>
        ))}
      </div>
      <button type="submit">Add expense</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

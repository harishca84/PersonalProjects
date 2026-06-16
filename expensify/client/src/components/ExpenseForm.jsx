import { useState } from 'react';

function buildEqualSplits(total, memberIds) {
  const share = Math.round((total / memberIds.length) * 100) / 100;
  return memberIds.map((userId, idx) => ({
    userId,
    amount:
      idx === memberIds.length - 1 ? Math.round((total - share * (memberIds.length - 1)) * 100) / 100 : share,
  }));
}

export default function ExpenseForm({ members, initialExpense, onSubmit, onCancel }) {
  const isEditing = Boolean(initialExpense);
  const [description, setDescription] = useState(initialExpense?.description ?? '');
  const [amount, setAmount] = useState(initialExpense?.amount?.toString() ?? '');
  const [paidBy, setPaidBy] = useState(initialExpense?.paid_by ?? members[0]?.id ?? '');
  const [splitWith, setSplitWith] = useState(
    initialExpense?.splits?.map((s) => s.userId) ?? members.map((m) => m.id)
  );
  const [error, setError] = useState('');

  function toggleSplit(userId) {
    setSplitWith((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
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

    const splits = buildEqualSplits(total, splitWith);

    try {
      await onSubmit({ description: description.trim(), amount: total, paidBy: Number(paidBy), splits });
      if (!isEditing) {
        setDescription('');
        setAmount('');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>{isEditing ? 'Edit expense' : 'Add expense'}</h2>
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
      <div className="form-actions">
        <button type="submit">{isEditing ? 'Save changes' : 'Add expense'}</button>
        {isEditing && (
          <button type="button" className="link" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

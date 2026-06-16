import { useState } from 'react';

export default function SettleUpForm({ members, currentUserId, onSettle }) {
  const others = members.filter((m) => m.id !== currentUserId);
  const [fromUser, setFromUser] = useState(currentUserId);
  const [toUser, setToUser] = useState(others[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const total = Number(amount);
    if (!fromUser || !toUser || fromUser === toUser || !Number.isFinite(total) || total <= 0) {
      setError('pick two different people and a positive amount');
      return;
    }
    try {
      await onSettle({ fromUser: Number(fromUser), toUser: Number(toUser), amount: total });
      setAmount('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Settle up</h2>
      <div className="inline-form">
        <select value={fromUser} onChange={(e) => setFromUser(Number(e.target.value))}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <span>paid</span>
        <select value={toUser} onChange={(e) => setToUser(Number(e.target.value))}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button type="submit">Record</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

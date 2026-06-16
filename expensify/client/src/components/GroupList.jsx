import { useState } from 'react';

export default function GroupList({ groups, currentUser, onCreateGroup, onSelectGroup, onLogout }) {
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');

  async function handleCreateGroup(e) {
    e.preventDefault();
    setError('');
    if (!groupName.trim()) {
      setError('group name is required');
      return;
    }
    try {
      const group = await onCreateGroup(groupName.trim());
      setGroupName('');
      onSelectGroup(group.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="header-row">
        <h1>Expensify</h1>
        <div>
          <span className="muted">{currentUser.name}</span>{' '}
          <button className="link" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>

      <section className="card">
        <h2>New group / trip</h2>
        <form onSubmit={handleCreateGroup} className="inline-form">
          <input
            placeholder="Group name (e.g. Trip to Vegas)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button type="submit">Create</button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Your groups</h2>
        {groups.length === 0 && <p>No groups yet. Create one above.</p>}
        <ul className="group-list">
          {groups.map((g) => (
            <li key={g.id}>
              <button className="link" onClick={() => onSelectGroup(g.id)}>
                {g.name}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

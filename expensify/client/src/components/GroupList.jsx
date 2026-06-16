import { useState } from 'react';

export default function GroupList({ groups, people, onCreateGroup, onSelectGroup, onCreatePerson }) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [error, setError] = useState('');

  function toggleMember(personId) {
    setSelectedMembers((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  }

  async function handleAddPerson(e) {
    e.preventDefault();
    setError('');
    if (!newPersonName.trim()) return;
    try {
      await onCreatePerson(newPersonName.trim());
      setNewPersonName('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    setError('');
    if (!groupName.trim() || selectedMembers.length === 0) {
      setError('group name and at least one member are required');
      return;
    }
    try {
      await onCreateGroup(groupName.trim(), selectedMembers);
      setGroupName('');
      setSelectedMembers([]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>Expensify</h1>

      <section className="card">
        <h2>Friends</h2>
        <ul className="people-list">
          {people.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
        <form onSubmit={handleAddPerson} className="inline-form">
          <input
            placeholder="Add a friend"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
          />
          <button type="submit">Add</button>
        </form>
      </section>

      <section className="card">
        <h2>New group / trip</h2>
        <form onSubmit={handleCreateGroup}>
          <input
            placeholder="Group name (e.g. Trip to Vegas)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <div className="checkbox-list">
            {people.map((p) => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(p.id)}
                  onChange={() => toggleMember(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
          <button type="submit">Create group</button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Groups</h2>
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

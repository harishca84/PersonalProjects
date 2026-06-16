import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import GroupList from './components/GroupList';
import GroupDetail from './components/GroupDetail';
import './App.css';

function App() {
  const [people, setPeople] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [p, g] = await Promise.all([api.getPeople(), api.getGroups()]);
      setPeople(p);
      setGroups(g);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreatePerson(name) {
    await api.createPerson(name);
    await refresh();
  }

  async function handleCreateGroup(name, memberIds) {
    await api.createGroup(name, memberIds);
    await refresh();
  }

  if (error) return <div className="page error">{error}</div>;

  if (selectedGroupId) {
    return (
      <GroupDetail
        groupId={selectedGroupId}
        allPeople={people}
        onBack={() => {
          setSelectedGroupId(null);
          refresh();
        }}
      />
    );
  }

  return (
    <GroupList
      groups={groups}
      people={people}
      onCreatePerson={handleCreatePerson}
      onCreateGroup={handleCreateGroup}
      onSelectGroup={setSelectedGroupId}
    />
  );
}

export default App;

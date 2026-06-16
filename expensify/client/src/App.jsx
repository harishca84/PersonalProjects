import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import AuthPage from './components/AuthPage';
import GroupList from './components/GroupList';
import GroupDetail from './components/GroupDetail';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .me()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  const refreshGroups = useCallback(async () => {
    try {
      setGroups(await api.getGroups());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (currentUser) refreshGroups();
  }, [currentUser, refreshGroups]);

  async function handleCreateGroup(name) {
    const group = await api.createGroup(name, []);
    await refreshGroups();
    return group;
  }

  async function handleLogout() {
    await api.logout();
    setCurrentUser(null);
    setSelectedGroupId(null);
    setGroups([]);
  }

  if (checkingSession) return null;

  if (!currentUser) {
    return <AuthPage onAuthenticated={setCurrentUser} />;
  }

  if (error) return <div className="page error">{error}</div>;

  if (selectedGroupId) {
    return (
      <GroupDetail
        groupId={selectedGroupId}
        currentUser={currentUser}
        onBack={() => {
          setSelectedGroupId(null);
          refreshGroups();
        }}
      />
    );
  }

  return (
    <GroupList
      groups={groups}
      currentUser={currentUser}
      onCreateGroup={handleCreateGroup}
      onSelectGroup={setSelectedGroupId}
      onLogout={handleLogout}
    />
  );
}

export default App;

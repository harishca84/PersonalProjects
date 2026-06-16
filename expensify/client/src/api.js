const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getPeople: () => request('/people'),
  createPerson: (name) => request('/people', { method: 'POST', body: JSON.stringify({ name }) }),

  getGroups: () => request('/groups'),
  getGroup: (id) => request(`/groups/${id}`),
  createGroup: (name, memberIds) =>
    request('/groups', { method: 'POST', body: JSON.stringify({ name, memberIds }) }),
  addMember: (groupId, personId) =>
    request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ personId }) }),

  getExpenses: (groupId) => request(`/groups/${groupId}/expenses`),
  createExpense: (groupId, expense) =>
    request(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(expense) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  getBalances: (groupId) => request(`/groups/${groupId}/balances`),
};

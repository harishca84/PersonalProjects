const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
  signup: (name, email, password) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  findUserByEmail: (email) => request(`/users?email=${encodeURIComponent(email)}`),

  getGroups: () => request('/groups'),
  getGroup: (id) => request(`/groups/${id}`),
  createGroup: (name, memberIds) =>
    request('/groups', { method: 'POST', body: JSON.stringify({ name, memberIds }) }),
  addMember: (groupId, email) =>
    request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ email }) }),

  getExpenses: (groupId) => request(`/groups/${groupId}/expenses`),
  createExpense: (groupId, expense) =>
    request(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(expense) }),
  updateExpense: (id, expense) =>
    request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(expense) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  getPayments: (groupId) => request(`/groups/${groupId}/payments`),
  createPayment: (groupId, payment) =>
    request(`/groups/${groupId}/payments`, { method: 'POST', body: JSON.stringify(payment) }),

  getBalances: (groupId) => request(`/groups/${groupId}/balances`),
};

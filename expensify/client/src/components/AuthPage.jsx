import { useState } from 'react';
import { api } from '../api';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = mode === 'login' ? await api.login(email, password) : await api.signup(name, email, password);
      onAuthenticated(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page narrow">
      <h1>Expensify</h1>
      <form className="card" onSubmit={handleSubmit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create an account'}</h2>
        {mode === 'signup' && (
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === 'signup' ? 8 : undefined}
        />
        <button type="submit" disabled={submitting}>
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        {error && <p className="error">{error}</p>}
        <p>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </form>
    </div>
  );
}

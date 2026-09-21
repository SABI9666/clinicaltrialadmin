import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Users({ notify, currentEmail }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'editor' });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createUser(form);
      setForm({ email: '', name: '', password: '', role: 'editor' });
      await load();
      notify({ type: 'success', message: 'User created.' });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(user) {
    const password = prompt(`New password for ${user.email} (at least 12 characters):`);
    if (!password) return;
    try {
      await api.setUserPassword(user.id, password);
      notify({ type: 'success', message: 'Password updated.' });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  async function remove(user) {
    if (!confirm(`Remove ${user.email}?`)) return;
    try {
      await api.removeUser(user.id);
      await load();
      notify({ type: 'success', message: 'User removed.' });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Users</h1>
          <p className="muted">
            Editors can change content. Admins can also manage users and delete enquiries.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.email}
                  {user.email === currentEmail && <span className="badge live"> you</span>}
                </td>
                <td>{user.name || '—'}</td>
                <td>{user.role}</td>
                <td className="row-controls">
                  <button type="button" onClick={() => resetPassword(user)}>
                    Set password
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => remove(user)}
                    disabled={user.email === currentEmail}
                    title={user.email === currentEmail ? 'You cannot remove your own account' : 'Remove'}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form className="inline-form" onSubmit={create}>
        <h2>Add a user</h2>
        <div className="inline-fields">
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              required
              minLength={12}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">Role</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create user'}
        </button>
      </form>
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { api, AuthError, getToken, setToken } from './lib/api.js';
import { SECTION_ORDER, SECTION_SCHEMAS, COLLECTION_ORDER, COLLECTION_SCHEMAS } from './lib/schemas.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SectionEditor from './pages/SectionEditor.jsx';
import CollectionEditor from './pages/CollectionEditor.jsx';
import Media from './pages/Media.jsx';
import Enquiries from './pages/Enquiries.jsx';
import Users from './pages/Users.jsx';
import Toast from './components/Toast.jsx';

const HOME = { kind: 'dashboard' };

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState(HOME);
  const [toast, setToast] = useState(null);

  const notify = useCallback((t) => setToast(t), []);

  // Resume a session held in sessionStorage across a page refresh.
  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    api
      .me()
      .then(({ user: u }) => setUser(u))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setView(HOME);
  }, []);

  // Any 401 from a child page means the token lapsed: drop back to the login
  // screen rather than leaving a dead console on screen.
  useEffect(() => {
    const onRejection = (e) => {
      if (e.reason instanceof AuthError) {
        signOut();
        notify({ type: 'error', message: e.reason.message });
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, [signOut, notify]);

  async function login(email, password) {
    const { token, user: u } = await api.login(email, password);
    setToken(token);
    setUser(u);
    setView(HOME);
  }

  if (checking) return <div className="login-screen"><p className="muted">Loading…</p></div>;
  if (!user) return <Login onLogin={login} />;

  const navItem = (target, label, badge) => {
    const active =
      view.kind === target.kind && (target.key === undefined || view.key === target.key);
    return (
      <button
        key={`${target.kind}:${target.key ?? ''}`}
        type="button"
        className={active ? 'active' : ''}
        onClick={() => setView(target)}
      >
        {label}
        {badge}
      </button>
    );
  };

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="mark">✳</span>
          <div>
            <strong>Clinical Trial Access</strong>
            <small>Content admin</small>
          </div>
        </div>

        <div className="nav-group">{navItem(HOME, 'Overview')}</div>

        <div className="nav-group">
          <h3>Page sections</h3>
          {SECTION_ORDER.map((key) =>
            navItem({ kind: 'section', key }, SECTION_SCHEMAS[key].title),
          )}
        </div>

        <div className="nav-group">
          <h3>Content</h3>
          {COLLECTION_ORDER.map((key) =>
            navItem({ kind: 'collection', key }, COLLECTION_SCHEMAS[key].title),
          )}
          {navItem({ kind: 'media' }, 'Images')}
        </div>

        <div className="nav-group">
          <h3>Admin</h3>
          {navItem({ kind: 'enquiries' }, 'Enquiries')}
          {user.role === 'admin' && navItem({ kind: 'users' }, 'Users')}
        </div>

        <div className="sidebar-foot">
          <span className="muted small">{user.email}</span>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="content">
        {view.kind === 'dashboard' && <Dashboard onNavigate={setView} notify={notify} />}
        {view.kind === 'section' && (
          <SectionEditor key={view.key} sectionKey={view.key} notify={notify} />
        )}
        {view.kind === 'collection' && (
          <CollectionEditor key={view.key} collection={view.key} notify={notify} />
        )}
        {view.kind === 'media' && <Media notify={notify} />}
        {view.kind === 'enquiries' && <Enquiries notify={notify} role={user.role} />}
        {view.kind === 'users' && <Users notify={notify} currentEmail={user.email} />}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

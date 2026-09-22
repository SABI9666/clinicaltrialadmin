import { useCallback, useEffect, useState } from 'react';
import { api, AuthError, getToken, setToken } from './lib/api.js';
import { SECTION_ORDER, SECTION_SCHEMAS, COLLECTION_ORDER, COLLECTION_SCHEMAS } from './lib/schemas.js';
import { confirmDiscard } from './lib/unsaved.js';
import { invalidateFacets } from './lib/facets.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Guide from './pages/Guide.jsx';
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

  // Nothing may be left half-saved when the page underneath changes.
  const navigate = useCallback((target) => {
    if (!confirmDiscard()) return;
    setView(target);
  }, []);

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
    invalidateFacets();
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

  const navItem = (target, label, hint) => {
    const active =
      view.kind === target.kind && (target.key === undefined || view.key === target.key);
    return (
      <button
        key={`${target.kind}:${target.key ?? ''}`}
        type="button"
        className={active ? 'active' : ''}
        title={hint}
        onClick={() => navigate(target)}
      >
        {label}
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
            <small>Website admin</small>
          </div>
        </div>

        <div className="nav-group">
          {navItem(HOME, 'Overview', 'Counts, quick links and where to start')}
          {navItem({ kind: 'guide' }, 'How-to guide', 'Step-by-step instructions for every job')}
        </div>

        <div className="nav-group">
          <h3>Page sections</h3>
          <p className="nav-note">The wording and pictures of the home page, top to bottom.</p>
          {SECTION_ORDER.map((key) =>
            navItem({ kind: 'section', key }, SECTION_SCHEMAS[key].title, SECTION_SCHEMAS[key].blurb),
          )}
        </div>

        <div className="nav-group">
          <h3>Content</h3>
          <p className="nav-note">The lists visitors browse and search.</p>
          {COLLECTION_ORDER.map((key) =>
            navItem(
              { kind: 'collection', key },
              COLLECTION_SCHEMAS[key].title,
              COLLECTION_SCHEMAS[key].blurb,
            ),
          )}
          {navItem({ kind: 'media' }, 'Images', 'Pictures uploaded for use anywhere on the site')}
        </div>

        <div className="nav-group">
          <h3>Admin</h3>
          {navItem({ kind: 'enquiries' }, 'Enquiries', 'Messages sent through the contact form')}
          {user.role === 'admin' &&
            navItem({ kind: 'users' }, 'Users', 'Who can sign in to this console')}
        </div>

        <div className="sidebar-foot">
          <span className="muted small">
            {user.email}
            <br />
            Signed in as {user.role === 'admin' ? 'an admin' : 'an editor'}
          </span>
          <button type="button" onClick={() => confirmDiscard() && signOut()}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="content">
        {view.kind === 'dashboard' && <Dashboard onNavigate={navigate} notify={notify} />}
        {view.kind === 'guide' && <Guide onNavigate={navigate} />}
        {view.kind === 'section' && (
          <SectionEditor
            key={view.key}
            sectionKey={view.key}
            notify={notify}
            role={user.role}
            onNavigate={navigate}
          />
        )}
        {view.kind === 'collection' && (
          <CollectionEditor
            key={view.key}
            collection={view.key}
            notify={notify}
            onNavigate={navigate}
          />
        )}
        {view.kind === 'media' && <Media notify={notify} />}
        {view.kind === 'enquiries' && <Enquiries notify={notify} role={user.role} />}
        {view.kind === 'users' && <Users notify={notify} currentEmail={user.email} />}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

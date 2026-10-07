import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import HelpPanel from '../components/HelpPanel.jsx';

const when = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

/**
 * The registration delivery log.
 *
 * Deliberately has nothing personal in it: a registration is emailed to its
 * centre and never stored, so this page answers "did it get there?" and
 * nothing else.
 */
export default function Registrations({ notify, role, onNavigate }) {
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState(null);

  const load = useCallback(() => {
    Promise.all([api.listRegistrations(), api.registrationStats()])
      .then(([list, s]) => {
        setRows(list);
        setStats(s);
      })
      .catch((err) => notify({ type: 'error', message: err.message }));
  }, [notify]);

  useEffect(load, [load]);

  async function remove(id) {
    if (!confirm('Remove this line from the log? It does not affect the email that was sent.')) return;
    try {
      await api.removeRegistration(id);
      load();
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Registrations</h1>
          <p className="muted">
            Proof that registrations reached the centres. No personal details are kept here.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" onClick={load}>
            Refresh
          </button>
        </div>
      </header>

      <HelpPanel
        id="registrations"
        steps={[
          'When a visitor completes a trial’s registration form, their details are emailed straight to the centre they chose and are never written down here.',
          'This page records only that it happened: when, which trial, which centre, and whether the email got through.',
          'A line marked "Not delivered" means the centre did not receive it — check that the centre has a valid email address, and that the mail service is set up.',
          'The centre replies directly to the person, because the email is addressed to come back to them.',
        ]}
        where="Nowhere — this log is for your team only."
      />

      {stats && !stats.mailConfigured && (
        <p className="field-warning">
          Email sending is not set up on the server yet, so registrations cannot be delivered. Set
          the <code>RESEND_API_KEY</code> and <code>MAIL_FROM</code> environment variables on the
          API and redeploy.
        </p>
      )}

      {stats && (
        <div className="stat-row" style={{ marginBottom: 18 }}>
          <span>
            <strong>{stats.total}</strong> total
          </span>
          <span>
            <strong>{stats.sent}</strong> delivered
          </span>
          <span>
            <strong>{stats.failed}</strong> not delivered
          </span>
        </div>
      )}

      {!rows ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <h2>No registrations yet</h2>
          <p className="muted">
            They appear here as soon as someone completes a trial&rsquo;s registration form.
          </p>
          {onNavigate && (
            <button type="button" onClick={() => onNavigate({ kind: 'collection', key: 'centres' })}>
              Check the centres and their emails →
            </button>
          )}
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Trial</th>
              <th>Centre</th>
              <th>Delivery</th>
              {role === 'admin' && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{when(r.createdAt)}</td>
                <td>{r.trialTitle || r.trialSlug || '—'}</td>
                <td>
                  {r.centreName || '—'}
                  {r.centreRegion && <span className="muted"> — {r.centreRegion}</span>}
                </td>
                <td>
                  <span className={`badge ${r.delivery === 'sent' ? 'live' : 'draft'}`}>
                    {r.delivery === 'sent' ? 'Delivered' : 'Not delivered'}
                  </span>
                  {r.delivery !== 'sent' && r.error && (
                    <p className="hint" style={{ marginTop: 4 }}>
                      {r.error}
                    </p>
                  )}
                </td>
                {role === 'admin' && (
                  <td>
                    <button type="button" className="danger" onClick={() => remove(r.id)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

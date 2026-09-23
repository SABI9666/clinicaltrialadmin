import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Enquiries — a delivery log, not an inbox.
 *
 * Contact form messages are emailed to the address set below and are never
 * stored, so there is nothing here to read: only whether each one arrived.
 * What people write lives in the recipient's mailbox, which is the point.
 */

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

export default function Enquiries({ notify, role }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [legacy, setLegacy] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [list, s, legacySummary] = await Promise.all([
        api.listEnquiries(),
        api.enquiryStats(),
        api.legacyEnquiries(),
      ]);
      setItems(list);
      setStats(s);
      setLegacy(legacySummary);
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api
      .getEnquirySettings()
      .then((s) => {
        setSettings(s);
        setNotifyEmail(s.notifyEmail);
      })
      .catch((err) => notify({ type: 'error', message: err.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveEmail(e) {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const saved = await api.saveEnquirySettings({ notifyEmail: notifyEmail.trim() });
      setSettings(saved);
      setNotifyEmail(saved.notifyEmail);
      notify({ type: 'success', message: `Enquiries will be emailed to ${saved.notifyEmail}.` });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setSavingEmail(false);
    }
  }

  async function purge() {
    if (
      !confirm(
        `Permanently delete ${legacy.count} stored enquir${legacy.count === 1 ? 'y' : 'ies'}, ` +
          'including the names, addresses and messages in them? This cannot be undone.',
      )
    ) {
      return;
    }
    try {
      const { deleted } = await api.purgeLegacyEnquiries();
      setLegacy({ count: 0 });
      notify({ type: 'success', message: `Deleted ${deleted} stored enquiries.` });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  const noAddress = settings && !settings.notifyEmail;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Enquiries</h1>
          <p className="muted">
            Contact form messages are emailed to you and never stored here. Each row is
            one enquiry — its reference matches the email's subject line, so you can find
            what was written in your inbox.
          </p>
        </div>
        {stats && (
          <div className="stat-row">
            <span>
              <strong>{stats.sent}</strong> delivered
            </span>
            <span>
              <strong>{stats.failed}</strong> failed
            </span>
            <span>
              <strong>{stats.total}</strong> total
            </span>
          </div>
        )}
      </header>

      <form className="notify-panel" onSubmit={saveEmail}>
        <div className="notify-copy">
          <strong>Where enquiries are emailed</strong>
          <p className="muted small">
            Every message from the contact form is sent here as it arrives, with the sender
            in Reply-To so you can answer straight from your inbox. This email is the only
            copy — nothing a person writes is kept on the website or in this console.
          </p>
        </div>

        <div className="notify-field">
          <label htmlFor="notify-email">Email address</label>
          <input
            id="notify-email"
            type="email"
            value={notifyEmail}
            placeholder="enquiries@your-domain.org"
            onChange={(e) => setNotifyEmail(e.target.value)}
            disabled={role !== 'admin'}
          />
          {role === 'admin' && (
            <button type="submit" disabled={savingEmail || notifyEmail === settings?.notifyEmail}>
              {savingEmail ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>

        {role !== 'admin' && <p className="muted small">Only an admin can change this address.</p>}

        {/* Without somewhere to send them, the form has nowhere to put a message
            at all — so this is a broken contact form, not a preference. */}
        {noAddress && (
          <p className="warn small">
            No address is set, so the contact form is turned off — it tells visitors it is
            temporarily unavailable rather than accepting messages that would go nowhere.
          </p>
        )}
        {settings && !settings.mailConfigured && (
          <p className="warn small">
            Email is not configured on the server, so nothing can be sent. Set RESEND_API_KEY
            and MAIL_FROM on the API and redeploy.
          </p>
        )}
      </form>

      {legacy?.count > 0 && (
        <div className="legacy-panel">
          <div>
            <strong>
              {legacy.count} enquir{legacy.count === 1 ? 'y' : 'ies'} still stored from before
            </strong>
            <p className="muted small">
              These were recorded when the form saved messages, so they still hold names,
              addresses and what people wrote — between {formatDate(legacy.oldest)} and{' '}
              {formatDate(legacy.newest)}. They are not shown here, because displaying them
              would undo the point. Delete them to finish clearing personal data out.
            </p>
          </div>
          {role === 'admin' ? (
            <button type="button" className="danger" onClick={purge}>
              Delete them permanently
            </button>
          ) : (
            <p className="muted small">Only an admin can delete these.</p>
          )}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No enquiries have been sent yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Enquiry</th>
              <th>When</th>
              <th>Country</th>
              <th>Trial</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {/* The same reference is in the email's subject line, so a row
                    here leads straight to the message in your inbox. */}
                <td><strong>Enquiry {item.ref ?? '—'}</strong></td>
                <td>{formatDate(item.createdAt)}</td>
                <td>{item.country || '—'}</td>
                <td>{item.trialSlug || '—'}</td>
                <td>
                  {item.delivery === 'sent' ? (
                    <span className="badge live">Delivered</span>
                  ) : (
                    <>
                      <span className="badge warn">Failed</span>
                      {item.error && <div className="muted small">{item.error}</div>}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

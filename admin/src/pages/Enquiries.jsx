import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
];

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

export default function Enquiries({ notify, role }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(status = filter) {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([api.listEnquiries(status || undefined), api.enquiryStats()]);
      setItems(list);
      setStats(s);
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function setStatus(item, status) {
    try {
      await api.updateEnquiry(item.id, { status });
      await load();
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  async function saveNotes(item, notes) {
    if (notes === (item.notes ?? '')) return;
    try {
      await api.updateEnquiry(item.id, { notes });
      setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, notes } : i)));
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  async function remove(item) {
    if (!confirm(`Delete the enquiry from ${item.name}? This cannot be undone.`)) return;
    try {
      await api.removeEnquiry(item.id);
      await load();
      notify({ type: 'success', message: 'Enquiry deleted.' });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Enquiries</h1>
          <p className="muted">Messages submitted through the website contact form.</p>
        </div>
        {stats && (
          <div className="stat-row">
            <span>
              <strong>{stats.new}</strong> new
            </span>
            <span>
              <strong>{stats.in_progress}</strong> in progress
            </span>
            <span>
              <strong>{stats.total}</strong> total
            </span>
          </div>
        )}
      </header>

      <div className="tab-row">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            className={filter === s.value ? 'active' : ''}
            onClick={() => setFilter(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No enquiries {filter ? `with status "${filter}"` : 'yet'}.</p>
      ) : (
        <div className="enquiry-list">
          {items.map((item) => (
            <article className="enquiry" key={item.id}>
              <header>
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted small"> · {item.country}</span>
                  <div className="muted small">
                    <a href={`mailto:${item.email}`}>{item.email}</a>
                    {item.phone && ` · ${item.phone}`}
                  </div>
                  {item.trialSlug && <div className="badge live">Trial: {item.trialSlug}</div>}
                </div>
                <div className="enquiry-meta">
                  <span className="muted small">{formatDate(item.createdAt)}</span>
                  <select value={item.status} onChange={(e) => setStatus(item, e.target.value)}>
                    <option value="new">New</option>
                    <option value="in_progress">In progress</option>
                    <option value="closed">Closed</option>
                  </select>
                  {role === 'admin' && (
                    <button type="button" className="danger" onClick={() => remove(item)}>
                      Delete
                    </button>
                  )}
                </div>
              </header>

              <p className="enquiry-message">{item.message}</p>

              <label className="field">
                <span className="field-label">Internal notes</span>
                <textarea
                  rows={2}
                  defaultValue={item.notes ?? ''}
                  placeholder="Not shown to the enquirer"
                  onBlur={(e) => saveNotes(item, e.target.value)}
                />
              </label>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

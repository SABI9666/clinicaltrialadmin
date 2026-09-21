import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { COLLECTION_ORDER, COLLECTION_SCHEMAS } from '../lib/schemas.js';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? '';

export default function Dashboard({ onNavigate, notify }) {
  const [counts, setCounts] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      Promise.all(COLLECTION_ORDER.map((c) => api.list(c).then((items) => [c, items]))),
      api.enquiryStats(),
    ])
      .then(([lists, enquiryStats]) => {
        setCounts(
          Object.fromEntries(
            lists.map(([name, items]) => [
              name,
              { total: items.length, live: items.filter((i) => i.published !== false).length },
            ]),
          ),
        );
        setStats(enquiryStats);
      })
      .catch((err) => notify({ type: 'error', message: err.message }));
  }, [notify]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">Everything on the public site is editable from here.</p>
        </div>
        {SITE_URL && (
          <div className="page-actions">
            <a className="button-link" href={SITE_URL} target="_blank" rel="noreferrer">
              View site ↗
            </a>
          </div>
        )}
      </header>

      <div className="cards">
        <article className="card highlight">
          <h2>Enquiries</h2>
          {stats ? (
            <>
              <p className="big">{stats.new}</p>
              <p className="muted">new of {stats.total} total</p>
            </>
          ) : (
            <p className="muted">Loading…</p>
          )}
          <button type="button" onClick={() => onNavigate({ kind: 'enquiries' })}>
            Open inbox
          </button>
        </article>

        {COLLECTION_ORDER.map((name) => (
          <article className="card" key={name}>
            <h2>{COLLECTION_SCHEMAS[name].title}</h2>
            {counts ? (
              <>
                <p className="big">{counts[name].total}</p>
                <p className="muted">{counts[name].live} live on the site</p>
              </>
            ) : (
              <p className="muted">Loading…</p>
            )}
            <button type="button" onClick={() => onNavigate({ kind: 'collection', key: name })}>
              Manage
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

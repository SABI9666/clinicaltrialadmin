import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { COLLECTION_ORDER, COLLECTION_SCHEMAS } from '../lib/schemas.js';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? '';

/** One line per card saying, in plain words, what the number counts. */
const WHAT_IT_IS = {
  trials: 'Trials visitors can search and read about.',
  reports: 'Cards under Insights → Reports.',
  faqs: 'Questions under Insights → FAQs.',
  news: 'Updates under Insights → News.',
  policies: 'Privacy, terms and cookie text in the footer.',
  centres: 'Recruiting centres, and where their registrations are emailed.',
};

const QUICK_ACTIONS = [
  {
    label: 'Add or edit a trial',
    detail: 'The trials visitors search through.',
    target: { kind: 'collection', key: 'trials' },
  },
  {
    label: 'Add a condition, country or state',
    detail: 'The options in the site’s search dropdowns.',
    target: { kind: 'section', key: 'facets' },
  },
  {
    label: 'Change home page wording',
    detail: 'Headings, paragraphs and buttons on the hero banner.',
    target: { kind: 'section', key: 'hero' },
  },
  {
    label: 'Read the visitor enquiries',
    detail: 'Messages from the contact form.',
    target: { kind: 'enquiries' },
  },
  {
    label: 'Check registrations reached the centres',
    detail: 'Delivery log \u2014 no personal details kept.',
    target: { kind: 'registrations' },
  },
];

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
          <p className="muted">
            Everything on the public website is edited from here. Nothing changes on the site until
            you press Save.
          </p>
        </div>
        {SITE_URL && (
          <div className="page-actions">
            <a className="button-link" href={SITE_URL} target="_blank" rel="noreferrer">
              View site ↗
            </a>
          </div>
        )}
      </header>

      <section className="welcome">
        <div>
          <h2>New to this console?</h2>
          <p className="muted">
            The how-to guide walks through adding a trial, adding a new condition, country or
            state / territory, and putting something live — one step at a time.
          </p>
        </div>
        <button type="button" className="primary" onClick={() => onNavigate({ kind: 'guide' })}>
          Open the how-to guide →
        </button>
      </section>

      <h2 className="block-title">Jump straight to</h2>
      <div className="quick-actions">
        {QUICK_ACTIONS.map((action) => (
          <button
            type="button"
            className="quick-action"
            key={action.label}
            onClick={() => onNavigate(action.target)}
          >
            <strong>{action.label}</strong>
            <span className="muted small">{action.detail}</span>
          </button>
        ))}
      </div>

      <h2 className="block-title">What is on the site</h2>
      <div className="cards">
        <article className="card highlight">
          <h2>Enquiries</h2>
          {stats ? (
            <>
              <p className="big">{stats.new}</p>
              <p className="muted">new, of {stats.total} received in total</p>
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
                <p className="muted">
                  {counts[name].live} live on the site
                  {counts[name].total - counts[name].live > 0 &&
                    `, ${counts[name].total - counts[name].live} draft`}
                </p>
              </>
            ) : (
              <p className="muted">Loading…</p>
            )}
            <p className="card-note">{WHAT_IT_IS[name]}</p>
            <button type="button" onClick={() => onNavigate({ kind: 'collection', key: name })}>
              Manage
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

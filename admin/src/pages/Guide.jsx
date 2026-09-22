import { GUIDE } from '../lib/guide.js';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? '';

/** The handbook: every routine job on the site, written out step by step. */
export default function Guide({ onNavigate }) {
  return (
    <>
      <header className="page-head">
        <div>
          <h1>How-to guide</h1>
          <p className="muted">
            Everything you need to run the site, in order. New here? Read "Start here" first.
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

      <nav className="guide-index" aria-label="Guide contents">
        {GUIDE.map((chapter) => (
          <a key={chapter.id} href={`#guide-${chapter.id}`}>
            {chapter.title}
          </a>
        ))}
      </nav>

      <div className="guide">
        {GUIDE.map((chapter, i) => (
          <article className="guide-chapter" id={`guide-${chapter.id}`} key={chapter.id}>
            <header>
              <span className="guide-number" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h2>{chapter.title}</h2>
                <p className="muted">{chapter.intro}</p>
              </div>
            </header>

            <ol className="guide-steps">
              {chapter.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>

            {chapter.note && (
              <p className="guide-note">
                <strong>Good to know:</strong> {chapter.note}
              </p>
            )}

            {chapter.goto && (
              <button type="button" onClick={() => onNavigate(chapter.goto)}>
                {chapter.gotoLabel} →
              </button>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

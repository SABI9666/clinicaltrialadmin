/**
 * The "How this page works" panel that heads every editor.
 *
 * Whether it is open is remembered per panel, so someone new keeps the
 * instructions on screen while someone experienced collapses them once and
 * never sees them again.
 */
import { useState } from 'react';

const key = (id) => `cta.admin.help.${id}`;

const readOpen = (id, fallback) => {
  try {
    const stored = localStorage.getItem(key(id));
    return stored === null ? fallback : stored === 'open';
  } catch {
    return fallback;
  }
};

export default function HelpPanel({
  id,
  title = 'How this page works',
  steps = [],
  where,
  footer,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));

  if (steps.length === 0 && !where) return null;

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(key(id), next ? 'open' : 'closed');
    } catch {
      /* storage blocked — the panel just reopens next time */
    }
  }

  return (
    <section className={`help-panel${open ? '' : ' collapsed'}`}>
      <button type="button" className="help-head" onClick={toggle} aria-expanded={open}>
        <span className="help-icon" aria-hidden="true">
          ?
        </span>
        <span className="help-title">{title}</span>
        <span className="help-toggle">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="help-body">
          {where && (
            <p className="help-where">
              <strong>Where this shows up:</strong> {where}
            </p>
          )}
          {steps.length > 0 && (
            <ol className="help-steps">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
          {footer}
        </div>
      )}
    </section>
  );
}

/**
 * Picks which recruiting centres a trial offers on its registration form.
 *
 * A centre with no email address cannot receive anything, so it is called out
 * here rather than failing silently for a visitor who picks it.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function CentrePicker({ value, onChange, notify, onNavigate }) {
  const [centres, setCentres] = useState(null);
  const chosen = Array.isArray(value) ? value : [];

  useEffect(() => {
    let active = true;
    api
      .list('centres')
      .then((items) => active && setCentres(items))
      .catch((err) => notify?.({ type: 'error', message: err.message }));
    return () => {
      active = false;
    };
  }, [notify]);

  if (!centres) return <p className="muted">Loading centres…</p>;

  const live = centres.filter((c) => c.published !== false);
  const missingEmail = live.filter((c) => chosen.includes(c.id) && !c.email);

  function toggle(id) {
    onChange(chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id]);
  }

  if (live.length === 0) {
    return (
      <div className="picker">
        <p className="empty-note">
          No centres have been set up yet. Add them under Trials → Centres & emails, then come back
          and tick the ones recruiting for this trial.
        </p>
        {onNavigate && (
          <button type="button" onClick={() => onNavigate({ kind: 'collection', key: 'centres' })}>
            Go to Centres & emails →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="picker">
      <div className="checklist">
        {live.map((centre) => (
          <label key={centre.id} className="check">
            <input
              type="checkbox"
              checked={chosen.includes(centre.id)}
              onChange={() => toggle(centre.id)}
            />
            <span>
              {centre.name}
              {centre.region && <span className="muted"> — {centre.region}</span>}
              {!centre.email && <span className="warn-tag"> no email set</span>}
            </span>
          </label>
        ))}
      </div>

      {missingEmail.length > 0 && (
        <p className="field-warning">
          {missingEmail.map((c) => `"${c.name}"`).join(', ')}{' '}
          {missingEmail.length === 1 ? 'has' : 'have'} no email address, so a visitor who picks{' '}
          {missingEmail.length === 1 ? 'it' : 'them'} cannot register. Add{' '}
          {missingEmail.length === 1 ? 'one' : 'them'} under Centres & emails.
        </p>
      )}

      <p className="hint">
        Tick every centre recruiting for this trial. Leave all of them unticked to offer the
        visitor every published centre.
      </p>
    </div>
  );
}

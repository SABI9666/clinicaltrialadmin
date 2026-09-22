/**
 * Pickers for the four values the public trial search filters on.
 *
 * Each one offers exactly the options the site shows in its dropdowns, so a
 * saved trial is always findable. When the wanted option does not exist yet,
 * "Add a new …" creates it in the Search filters section on the spot — the new
 * admin never has to know those two screens are connected.
 */
import { useState } from 'react';
import { statesOf, useFacets } from '../lib/facets.js';

const ANY = '';

/** Small inline "add a new option" form, shown only once its button is used. */
function AddOption({ label, placeholder, hint, onAdd, notify }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    try {
      await onAdd(value);
      notify?.({ type: 'success', message: `"${value}" added to the site's search filters.` });
      setText('');
      setOpen(false);
    } catch (err) {
      notify?.({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="link-button" onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  }

  return (
    <form className="add-option" onSubmit={submit}>
      <input
        autoFocus
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="primary" disabled={busy || !text.trim()}>
        {busy ? 'Adding…' : 'Add'}
      </button>
      <button type="button" onClick={() => { setOpen(false); setText(''); }} disabled={busy}>
        Cancel
      </button>
      {hint && <p className="hint add-option-hint">{hint}</p>}
    </form>
  );
}

/** Warning shown when a saved value is not one of the site's filter options. */
function Mismatch({ value, onFix, noun }) {
  return (
    <p className="field-warning">
      <strong>"{value}"</strong> is not one of the {noun} in the site's search filters, so this
      trial will not appear when a visitor filters by it.{' '}
      <button type="button" className="link-button" onClick={onFix}>
        Add "{value}" to the filters
      </button>
    </p>
  );
}

/** Condition / country / age-range picker, all of which are a single value. */
export function OptionPicker({ field, value, onChange, notify }) {
  const facets = useFacets();
  const { source } = field;

  const options =
    source === 'countries'
      ? facets.facets.countries.map((c) => c.name)
      : facets.facets[source] ?? [];

  const add =
    source === 'conditions'
      ? facets.addCondition
      : source === 'countries'
        ? facets.addCountry
        : facets.addAgeRange;

  const noun =
    source === 'conditions' ? 'conditions' : source === 'countries' ? 'countries' : 'age ranges';

  const current = value ?? '';
  const unknown = current !== '' && !options.includes(current);

  /**
   * Adopt a value the filters do not know yet. The stored option is trimmed,
   * so the trial has to be trimmed too — otherwise "Diabetes " and "Diabetes"
   * still fail to match and the warning never clears.
   */
  async function adopt(v) {
    const tidy = v.trim();
    try {
      await add(tidy);
      if (tidy !== v) onChange(tidy);
      notify?.({
        type: 'success',
        message: `"${tidy}" added to the site's search filters and selected here.`,
      });
    } catch (err) {
      notify?.({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="picker">
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        disabled={!facets.ready && options.length === 0}
      >
        <option value={ANY}>{field.anyLabel ?? 'Not specified'}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {unknown && (
          <option value={current}>{current} — not in the filter list</option>
        )}
      </select>

      <div className="picker-foot">
        <AddOption
          label={field.addLabel ?? `Add a new ${field.label.toLowerCase()}`}
          placeholder={field.addPlaceholder ?? `New ${field.label.toLowerCase()}`}
          hint="This is added to the site's search filters straight away, so visitors can filter by it."
          onAdd={async (v) => {
            await add(v);
            onChange(v);
          }}
          notify={notify}
        />
      </div>

      {unknown && <Mismatch value={current} noun={noun} onFix={() => adopt(current)} />}
    </div>
  );
}

/**
 * States / territories for a trial: a checklist of whatever the chosen country
 * offers, because a trial can run in several at once.
 */
export function StatePicker({ value, onChange, record, notify }) {
  const { facets, addState } = useFacets();
  const country = record?.country ?? '';
  const options = statesOf(facets, country);
  const chosen = Array.isArray(value) ? value : [];
  const extras = chosen.filter((s) => !options.includes(s));

  function toggle(state) {
    onChange(chosen.includes(state) ? chosen.filter((s) => s !== state) : [...chosen, state]);
  }

  /** Put a ticked-but-unlisted state into the country's filter list. */
  async function adopt(state) {
    const tidy = state.trim();
    try {
      await addState(country, tidy);
      if (tidy !== state) onChange(chosen.map((s) => (s === state ? tidy : s)));
      notify?.({
        type: 'success',
        message: `"${tidy}" added to ${country} in the site's search filters.`,
      });
    } catch (err) {
      notify?.({ type: 'error', message: err.message });
    }
  }

  if (!country) {
    return (
      <p className="empty-note">
        Choose a country first — the states and territories on offer depend on it.
      </p>
    );
  }

  return (
    <div className="picker">
      {options.length === 0 && extras.length === 0 ? (
        <p className="empty-note">
          {country} has no states or territories listed yet. Add the first one below.
        </p>
      ) : (
        <div className="checklist">
          {options.map((state) => (
            <label key={state} className="check">
              <input
                type="checkbox"
                checked={chosen.includes(state)}
                onChange={() => toggle(state)}
              />
              <span>{state}</span>
            </label>
          ))}
          {extras.map((state) => (
            <label key={state} className="check check-unknown">
              <input type="checkbox" checked onChange={() => toggle(state)} />
              <span>{state} — not in the filter list</span>
            </label>
          ))}
        </div>
      )}

      {extras.length > 0 && (
        <p className="field-warning">
          {extras.length === 1 ? 'This state is' : 'These states are'} not listed under {country} in
          the site's search filters, so {extras.length === 1 ? 'it does' : 'they do'} not narrow a
          visitor's location search:{' '}
          {extras.map((state, i) => (
            <span key={state}>
              {i > 0 && ', '}
              <button type="button" className="link-button" onClick={() => adopt(state)}>
                add "{state}"
              </button>
            </span>
          ))}
        </p>
      )}

      <div className="picker-foot">
        <AddOption
          label={`Add a new state or territory for ${country}`}
          placeholder={`New state or territory in ${country}`}
          hint={`This is added to ${country} in the site's search filters, then ticked here.`}
          onAdd={async (v) => {
            await addState(country, v);
            if (!chosen.includes(v)) onChange([...chosen, v]);
          }}
          notify={notify}
        />
      </div>

      <p className="hint">
        Tick every state or territory this trial recruits in. Leave all of them unticked if the
        locations are not confirmed yet — the trial then shows up under every location search.
      </p>
    </div>
  );
}

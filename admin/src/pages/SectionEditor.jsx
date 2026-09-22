import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { SECTION_SCHEMAS } from '../lib/schemas.js';
import { primeFacets } from '../lib/facets.js';
import { setDirty } from '../lib/unsaved.js';
import FieldGroups from '../components/FieldGroups.jsx';
import HelpPanel from '../components/HelpPanel.jsx';

export default function SectionEditor({ sectionKey, notify, role, onNavigate }) {
  const schema = SECTION_SCHEMAS[sectionKey];
  const [value, setValue] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setValue(null);
    setError('');

    api
      .getSection(sectionKey)
      .then((data) => {
        if (!active) return;
        setValue(data);
        setSaved(JSON.stringify(data));
      })
      .catch((err) => active && setError(err.message));

    return () => {
      active = false;
    };
  }, [sectionKey]);

  const dirty = Boolean(value) && JSON.stringify(value) !== saved;

  // Tell the shell, so switching pages or closing the tab can warn first.
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty]);

  function store(result) {
    setValue(result);
    setSaved(JSON.stringify(result));
    // The filter lists are cached for the trial editor's dropdowns; edits here
    // are the one place they change outside it.
    if (sectionKey === 'facets') primeFacets(result);
  }

  async function save() {
    setBusy(true);
    try {
      store(await api.saveSection(sectionKey, value));
      notify({ type: 'success', message: `${schema.title} saved. The site is updated.` });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (
      !confirm(
        `Put "${schema.title}" back to the wording it shipped with? Everything you have written here will be lost, and this cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      store(await api.resetSection(sectionKey));
      notify({ type: 'success', message: `${schema.title} reset to the original wording.` });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!value) return <p className="muted">Loading…</p>;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{schema.title}</h1>
          <p className="muted">{schema.blurb}</p>
        </div>
        <div className="page-actions">
          {dirty && <span className="dirty-flag">Not saved yet</span>}
          {role === 'admin' && (
            <button type="button" onClick={reset} disabled={busy}>
              Reset to default
            </button>
          )}
          <button type="button" className="primary" onClick={save} disabled={busy || !dirty}>
            {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </header>

      <HelpPanel
        id={`section.${sectionKey}`}
        steps={schema.steps}
        where={schema.where}
        footer={
          sectionKey === 'facets' && onNavigate ? (
            <button type="button" onClick={() => onNavigate({ kind: 'collection', key: 'trials' })}>
              Go to Trials →
            </button>
          ) : null
        }
      />

      <FieldGroups
        schema={schema}
        value={value}
        ctx={{ notify, record: value }}
        onChange={(key, v) => setValue((cur) => ({ ...cur, [key]: v }))}
      />
    </>
  );
}

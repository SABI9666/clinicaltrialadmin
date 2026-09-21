import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { SECTION_SCHEMAS } from '../lib/schemas.js';
import Field from '../components/Fields.jsx';

export default function SectionEditor({ sectionKey, notify }) {
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

  const dirty = value && JSON.stringify(value) !== saved;

  async function save() {
    setBusy(true);
    try {
      const result = await api.saveSection(sectionKey, value);
      setValue(result);
      setSaved(JSON.stringify(result));
      notify({ type: 'success', message: `${schema.title} saved.` });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!confirm(`Reset "${schema.title}" to the original content? Your edits will be lost.`)) return;
    setBusy(true);
    try {
      const result = await api.resetSection(sectionKey);
      setValue(result);
      setSaved(JSON.stringify(result));
      notify({ type: 'success', message: `${schema.title} reset.` });
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
          <button type="button" onClick={reset} disabled={busy}>
            Reset to default
          </button>
          <button type="button" className="primary" onClick={save} disabled={busy || !dirty}>
            {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </header>

      <div className="editor">
        {schema.fields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={value[field.key]}
            onChange={(v) => setValue((cur) => ({ ...cur, [field.key]: v }))}
          />
        ))}
      </div>
    </>
  );
}

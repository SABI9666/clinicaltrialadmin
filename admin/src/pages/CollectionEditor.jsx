import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { COLLECTION_SCHEMAS } from '../lib/schemas.js';
import Field from '../components/Fields.jsx';

/** Derive a URL-safe slug so the slug field fills itself in from the title. */
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export default function CollectionEditor({ collection, notify }) {
  const schema = COLLECTION_SCHEMAS[collection];
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const isNew = selectedId === 'new';
  const hasSlug = schema.fields.some((f) => f.key === 'slug');

  async function load(selectAfter) {
    setLoading(true);
    try {
      const data = await api.list(collection);
      setItems(data);
      if (selectAfter) {
        const found = data.find((d) => d.id === selectAfter);
        setSelectedId(found?.id ?? null);
        setDraft(found ?? null);
      }
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedId(null);
    setDraft(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  function startNew() {
    setSelectedId('new');
    setDraft(structuredClone(schema.blank));
  }

  function select(item) {
    setSelectedId(item.id);
    setDraft(structuredClone(item));
  }

  function setField(key, value) {
    setDraft((cur) => {
      const next = { ...cur, [key]: value };
      // Fill an untouched slug from the title so new entries need one less step.
      if (key === schema.titleField && hasSlug && (!cur.slug || cur.slug === slugify(cur[schema.titleField] ?? ''))) {
        next.slug = slugify(value ?? '');
      }
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      if (isNew) {
        const created = await api.create(collection, draft);
        await load(created.id);
        notify({ type: 'success', message: `${schema.singular} created.` });
      } else {
        await api.update(collection, selectedId, draft);
        await load(selectedId);
        notify({ type: 'success', message: `${schema.singular} saved.` });
      }
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete "${item[schema.titleField] || 'this item'}"? This cannot be undone.`)) return;
    try {
      await api.remove(collection, item.id);
      if (item.id === selectedId) {
        setSelectedId(null);
        setDraft(null);
      }
      await load();
      notify({ type: 'success', message: `${schema.singular} deleted.` });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  async function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((i) => i.id);
    const [id] = ids.splice(index, 1);
    ids.splice(target, 0, id);
    setItems(ids.map((i) => items.find((x) => x.id === i)));
    try {
      await api.reorder(collection, ids);
    } catch (err) {
      notify({ type: 'error', message: err.message });
      await load();
    }
  }

  async function togglePublished(item) {
    try {
      await api.update(collection, item.id, { published: !item.published });
      await load(selectedId === item.id ? item.id : undefined);
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  const dirty = draft && JSON.stringify(draft) !== JSON.stringify(selected ?? schema.blank);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{schema.title}</h1>
          <p className="muted">{schema.blurb}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="primary" onClick={startNew}>
            + New {schema.singular.toLowerCase()}
          </button>
        </div>
      </header>

      <div className="collection">
        <aside className="collection-list">
          {loading ? (
            <p className="muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="muted">Nothing here yet.</p>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                className={`collection-item${item.id === selectedId ? ' active' : ''}`}
              >
                <button type="button" className="collection-item-main" onClick={() => select(item)}>
                  <span className="collection-item-title">
                    {item[schema.titleField] || '(untitled)'}
                  </span>
                  <span className={`badge ${item.published === false ? 'draft' : 'live'}`}>
                    {item.published === false ? 'Draft' : 'Live'}
                  </span>
                </button>
                <div className="row-controls">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title="Move up">
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublished(item)}
                    title={item.published === false ? 'Publish' : 'Unpublish'}
                  >
                    {item.published === false ? '◯' : '●'}
                  </button>
                  <button type="button" className="danger" onClick={() => remove(item)} title="Delete">
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </aside>

        <div className="collection-detail">
          {!draft ? (
            <p className="muted">
              Select {schema.singular.toLowerCase() === 'faq' ? 'an' : 'a'}{' '}
              {schema.singular.toLowerCase()} to edit, or create a new one.
            </p>
          ) : (
            <>
              <div className="detail-head">
                <h2>{isNew ? `New ${schema.singular.toLowerCase()}` : draft[schema.titleField] || '(untitled)'}</h2>
                <button type="button" className="primary" onClick={save} disabled={busy || (!isNew && !dirty)}>
                  {busy ? 'Saving…' : isNew ? `Create ${schema.singular.toLowerCase()}` : dirty ? 'Save changes' : 'Saved'}
                </button>
              </div>

              <div className="editor">
                {schema.fields.map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    value={draft[field.key]}
                    onChange={(v) => setField(field.key, v)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { COLLECTION_SCHEMAS } from '../lib/schemas.js';
import { setDirty } from '../lib/unsaved.js';
import FieldGroups from '../components/FieldGroups.jsx';
import HelpPanel from '../components/HelpPanel.jsx';

/** Derive a URL-safe slug so the slug field fills itself in from the title. */
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export default function CollectionEditor({ collection, notify, onNavigate }) {
  const schema = COLLECTION_SCHEMAS[collection];
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const isNew = selectedId === 'new';
  const hasSlug = schema.fields.some((f) => f.key === 'slug');
  const noun = schema.singular.toLowerCase();

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
    setQuery('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const dirty = Boolean(draft) && JSON.stringify(draft) !== JSON.stringify(selected ?? schema.blank);

  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty]);

  /** Guard every way of walking away from a half-finished entry. */
  function leaveDraft() {
    if (!dirty) return true;
    return confirm(
      `Your changes to this ${noun} are not saved yet. Leave them and lose the changes?`,
    );
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      String(i[schema.titleField] ?? '')
        .toLowerCase()
        .includes(q),
    );
  }, [items, query, schema.titleField]);

  const liveCount = items.filter((i) => i.published !== false).length;

  function startNew() {
    if (!leaveDraft()) return;
    setSelectedId('new');
    setDraft(structuredClone(schema.blank));
  }

  function select(item) {
    if (item.id === selectedId) return;
    if (!leaveDraft()) return;
    setSelectedId(item.id);
    setDraft(structuredClone(item));
  }

  function setField(key, value) {
    setDraft((cur) => {
      const next = { ...cur, [key]: value };
      // Fill an untouched slug from the title so new entries need one less step.
      if (
        key === schema.titleField &&
        hasSlug &&
        (!cur.slug || cur.slug === slugify(cur[schema.titleField] ?? ''))
      ) {
        next.slug = slugify(value ?? '');
      }
      // A different country invalidates states chosen under the previous one.
      if (key === 'country') next.states = [];
      return next;
    });
  }

  /** Catch the empty required boxes here, with a friendlier message than 400. */
  function missingRequired() {
    return schema.fields
      .filter((f) => f.required && !String(draft?.[f.key] ?? '').trim())
      .map((f) => f.label);
  }

  async function save() {
    const missing = missingRequired();
    if (missing.length > 0) {
      notify({
        type: 'error',
        message: `Please fill in: ${missing.join(', ')}.`,
      });
      return;
    }

    setBusy(true);
    try {
      if (isNew) {
        const created = await api.create(collection, draft);
        await load(created.id);
        notify({ type: 'success', message: `${schema.singular} created.` });
      } else {
        await api.update(collection, selectedId, draft);
        await load(selectedId);
        notify({ type: 'success', message: `${schema.singular} saved. The site is updated.` });
      }
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (
      !confirm(
        `Delete "${item[schema.titleField] || `this ${noun}`}" for good? This cannot be undone — to hide it instead, use the ● button.`,
      )
    )
      return;
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
    const goingLive = item.published === false;
    try {
      await api.update(collection, item.id, { published: goingLive });
      await load(selectedId === item.id ? item.id : undefined);
      notify({
        type: 'success',
        message: goingLive
          ? `"${item[schema.titleField] || noun}" is now live on the site.`
          : `"${item[schema.titleField] || noun}" is now a draft and hidden from the site.`,
      });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{schema.title}</h1>
          <p className="muted">{schema.blurb}</p>
        </div>
        <div className="page-actions">
          {dirty && <span className="dirty-flag">Not saved yet</span>}
          <button type="button" className="primary" onClick={startNew}>
            + New {noun}
          </button>
        </div>
      </header>

      <HelpPanel
        id={`collection.${collection}`}
        steps={schema.steps}
        where={schema.where}
        footer={
          collection === 'trials' && onNavigate ? (
            <button type="button" onClick={() => onNavigate({ kind: 'section', key: 'facets' })}>
              Manage the search filter options →
            </button>
          ) : null
        }
      />

      <div className="collection">
        <aside className="collection-list">
          <div className="list-head">
            <input
              type="search"
              value={query}
              placeholder={`Search ${schema.title.toLowerCase()}…`}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={`Search ${schema.title}`}
            />
            {!loading && (
              <p className="muted small">
                {items.length} total · {liveCount} live on the site
              </p>
            )}
          </div>

          {loading ? (
            <p className="muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="muted">
              Nothing here yet. Press "+ New {noun}" to add the first one.
            </p>
          ) : visible.length === 0 ? (
            <p className="muted">No {schema.title.toLowerCase()} match "{query}".</p>
          ) : (
            visible.map((item) => {
              const index = items.indexOf(item);
              return (
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
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || Boolean(query)}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1 || Boolean(query)}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublished(item)}
                      title={
                        item.published === false
                          ? 'Publish — show on the site'
                          : 'Unpublish — hide from the site'
                      }
                    >
                      {item.published === false ? '◯' : '●'}
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => remove(item)}
                      title="Delete for good"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </aside>

        <div className="collection-detail">
          {!draft ? (
            <div className="empty-state">
              <h2>Nothing open yet</h2>
              <p className="muted">
                Choose {noun === 'faq' ? 'an' : 'a'} {noun} from the list on the left to edit it, or
                press "+ New {noun}" to add one.
              </p>
            </div>
          ) : (
            <>
              <div className="detail-head">
                <div>
                  <h2>{isNew ? `New ${noun}` : draft[schema.titleField] || '(untitled)'}</h2>
                  {!isNew && (
                    <span className={`badge ${draft.published === false ? 'draft' : 'live'}`}>
                      {draft.published === false ? 'Draft' : 'Live'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="primary"
                  onClick={save}
                  disabled={busy || (!isNew && !dirty)}
                >
                  {busy
                    ? 'Saving…'
                    : isNew
                      ? `Create ${noun}`
                      : dirty
                        ? 'Save changes'
                        : 'Saved'}
                </button>
              </div>

              <FieldGroups
                schema={schema}
                value={draft}
                ctx={{ notify, record: draft }}
                onChange={setField}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { api, mediaUrl } from '../lib/api.js';

export default function Media({ notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await api.listMedia());
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(files) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of files) await api.uploadMedia(file, '');
      await load();
      notify({ type: 'success', message: `Uploaded ${files.length} image(s).` });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function saveAlt(item, alt) {
    if (alt === item.alt) return;
    try {
      await api.updateMedia(item.id, alt);
      setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, alt } : i)));
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.filename}"? Any section still using it will lose its image.`)) return;
    try {
      await api.removeMedia(item.id);
      await load();
      notify({ type: 'success', message: 'Image deleted.' });
    } catch (err) {
      notify({ type: 'error', message: err.message });
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Pictures</h1>
          <p className="muted">Upload images once, then pick them in any section.</p>
        </div>
        <div className="page-actions">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
            onChange={(e) => upload([...e.target.files])}
            disabled={uploading}
          />
          {uploading && <span className="muted">Uploading…</span>}
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No images uploaded yet.</p>
      ) : (
        <div className="media-manage">
          {items.map((item) => (
            <article className="media-card" key={item.id}>
              <img src={mediaUrl(item.url)} alt={item.alt || item.filename} />
              <div className="media-card-body">
                <strong title={item.filename}>{item.filename}</strong>
                <span className="muted small">
                  {(item.size / 1024).toFixed(0)} KB · {item.mimetype}
                </span>
                <label className="field">
                  <span className="field-label">Alt text</span>
                  <input
                    defaultValue={item.alt ?? ''}
                    placeholder="Describe the image"
                    onBlur={(e) => saveAlt(item, e.target.value)}
                  />
                </label>
                <div className="media-card-actions">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(item.url)}
                    title="Copy the path to paste into a section"
                  >
                    Copy path
                  </button>
                  <button type="button" className="danger" onClick={() => remove(item)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

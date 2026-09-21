import { useEffect, useRef, useState } from 'react';
import { api, mediaUrl } from '../lib/api.js';

/** Modal for choosing an existing upload or adding a new one. */
export default function MediaPicker({ onSelect, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await api.listMedia());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const created = await api.uploadMedia(file, '');
      await load();
      onSelect(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Choose an image" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Images</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="modal-body">
          <div className="upload-row">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
              onChange={(e) => upload(e.target.files?.[0])}
              disabled={uploading}
            />
            {uploading && <span className="muted">Uploading…</span>}
          </div>

          {error && <p className="error">{error}</p>}
          {loading ? (
            <p className="muted">Loading images…</p>
          ) : items.length === 0 ? (
            <p className="muted">No images uploaded yet.</p>
          ) : (
            <div className="media-grid">
              {items.map((item) => (
                <button type="button" className="media-tile" key={item.id} onClick={() => onSelect(item)}>
                  <img src={mediaUrl(item.url)} alt={item.alt || item.filename} />
                  <span>{item.filename}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

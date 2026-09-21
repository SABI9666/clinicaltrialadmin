import { useEffect } from 'react';

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDismiss, toast.type === 'error' ? 6000 : 3000);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`} role="status">
      {toast.message}
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

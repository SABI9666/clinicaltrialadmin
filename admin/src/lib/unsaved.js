/**
 * A single flag for "an editor on screen has unsaved edits".
 *
 * The editors set it; the sidebar checks it before switching pages, and the
 * browser checks it before closing the tab. Keeping it here means neither has
 * to know anything about the other.
 */
let dirty = false;

export function setDirty(value) {
  dirty = Boolean(value);
}

export const isDirty = () => dirty;

/** True when it is safe to leave — either nothing is unsaved, or it was okayed. */
export function confirmDiscard() {
  if (!dirty) return true;
  const ok = confirm('You have changes that are not saved yet. Leave this page and lose them?');
  if (ok) dirty = false;
  return ok;
}

// Cover the browser's own ways of leaving: closing the tab, reload, back.
window.addEventListener('beforeunload', (e) => {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
});

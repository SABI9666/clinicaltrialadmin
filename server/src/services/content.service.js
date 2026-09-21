import { getStore } from '../db/store.js';
import { SINGLETONS, COLLECTIONS } from '../seed/content.js';

/** Firestore collection holding the singleton section documents. */
const CONTENT = 'content';

export const SINGLETON_KEYS = Object.keys(SINGLETONS);
export const COLLECTION_KEYS = Object.keys(COLLECTIONS);

export function isSingleton(key) {
  return SINGLETON_KEYS.includes(key);
}

export function isCollection(key) {
  return COLLECTION_KEYS.includes(key);
}

/** Read a singleton section, falling back to the bundled default. */
export async function getSection(key) {
  if (!isSingleton(key)) throw Object.assign(new Error(`Unknown section: ${key}`), { status: 404 });
  const store = await getStore();
  const doc = await store.getDoc(CONTENT, key);
  if (doc) {
    const { id, createdAt, updatedAt, ...value } = doc;
    return value;
  }
  return structuredClone(SINGLETONS[key]);
}

export async function saveSection(key, value) {
  if (!isSingleton(key)) throw Object.assign(new Error(`Unknown section: ${key}`), { status: 404 });
  const store = await getStore();
  const saved = await store.setDoc(CONTENT, key, value);
  const { id, createdAt, updatedAt, ...clean } = saved;
  return clean;
}

export async function resetSection(key) {
  return saveSection(key, structuredClone(SINGLETONS[key]));
}

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id));

/**
 * List a content collection. `publishedOnly` is what the public site uses so
 * drafts stay invisible until an admin publishes them.
 */
export async function listItems(collection, { publishedOnly = false } = {}) {
  if (!isCollection(collection)) {
    throw Object.assign(new Error(`Unknown collection: ${collection}`), { status: 404 });
  }
  const store = await getStore();
  const items = await store.listDocs(collection);
  const visible = publishedOnly ? items.filter((i) => i.published !== false) : items;
  return visible.sort(byOrder);
}

export async function getItem(collection, id) {
  const store = await getStore();
  const item = await store.getDoc(collection, id);
  if (!item) throw Object.assign(new Error('Not found'), { status: 404 });
  return item;
}

export async function createItem(collection, value) {
  if (!isCollection(collection)) {
    throw Object.assign(new Error(`Unknown collection: ${collection}`), { status: 404 });
  }
  const store = await getStore();
  const existing = await store.listDocs(collection);
  const order = value.order ?? existing.length + 1;
  return store.addDoc(collection, { ...value, order });
}

export async function updateItem(collection, id, patch) {
  if (!isCollection(collection)) {
    throw Object.assign(new Error(`Unknown collection: ${collection}`), { status: 404 });
  }
  const store = await getStore();
  const current = await store.getDoc(collection, id);
  if (!current) throw Object.assign(new Error('Not found'), { status: 404 });
  return store.mergeDoc(collection, id, patch);
}

export async function deleteItem(collection, id) {
  if (!isCollection(collection)) {
    throw Object.assign(new Error(`Unknown collection: ${collection}`), { status: 404 });
  }
  const store = await getStore();
  const ok = await store.deleteDoc(collection, id);
  if (!ok) throw Object.assign(new Error('Not found'), { status: 404 });
  return { id, deleted: true };
}

/** Persist a new ordering for a collection in one pass. */
export async function reorderItems(collection, ids) {
  const store = await getStore();
  const updated = [];
  for (const [index, id] of ids.entries()) {
    const current = await store.getDoc(collection, id);
    if (current) updated.push(await store.mergeDoc(collection, id, { order: index + 1 }));
  }
  return updated.sort(byOrder);
}

/**
 * The single payload the public site fetches on load: every section plus every
 * published collection, so the frontend renders in one round trip.
 */
export async function getPublicSite() {
  const sections = Object.fromEntries(
    await Promise.all(SINGLETON_KEYS.map(async (k) => [k, await getSection(k)])),
  );
  const [trials, reports, faqs, news, policies] = await Promise.all(
    ['trials', 'reports', 'faqs', 'news', 'policies'].map((c) =>
      listItems(c, { publishedOnly: true }),
    ),
  );
  return { ...sections, trials, reports, faqs, news, policies };
}

/** Write the bundled defaults for anything that has no stored document yet. */
export async function seedIfEmpty() {
  const store = await getStore();
  const created = { sections: [], collections: {} };

  for (const key of SINGLETON_KEYS) {
    if (!(await store.getDoc(CONTENT, key))) {
      await store.setDoc(CONTENT, key, structuredClone(SINGLETONS[key]));
      created.sections.push(key);
    }
  }

  for (const [collection, items] of Object.entries(COLLECTIONS)) {
    const existing = await store.listDocs(collection);
    if (existing.length === 0 && items.length > 0) {
      for (const item of items) await store.addDoc(collection, structuredClone(item));
      created.collections[collection] = items.length;
    }
  }

  return created;
}

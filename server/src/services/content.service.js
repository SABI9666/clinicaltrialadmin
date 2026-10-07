import { getStore } from '../db/store.js';
import {
  SINGLETONS,
  COLLECTIONS,
  PLACEHOLDER_POLICY_BODY,
  enquirySettings,
} from '../seed/content.js';

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
 * A centre as the public site is allowed to see it.
 *
 * The notification address is deliberately dropped: it is an internal contact
 * for the research team, and publishing it on an open endpoint would hand it
 * to every scraper that visits. Registration email is addressed server-side
 * from the stored centre, so the browser never needs it.
 */
export const publicCentre = ({ id, name, region }) => ({ id, name, region });

export async function listPublicCentres() {
  const centres = await listItems('centres', { publishedOnly: true });
  return centres.map(publicCentre);
}

/** Look up a centre by id, with its address, for sending a registration. */
export async function getCentreForDelivery(id) {
  const centres = await listItems('centres', { publishedOnly: true });
  return centres.find((c) => c.id === id) ?? null;
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
  return { ...sections, trials, reports, faqs, news, policies, centres: await listPublicCentres() };
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

  created.policiesUpdated = await replacePlaceholderPolicies();
  created.updates = await applyContentUpdates();
  return created;
}

/** Policies renamed since the placeholders were seeded: old slug → new slug. */
const RENAMED_POLICIES = { 'terms-of-use': 'legal-notice' };

/**
 * Swap stored policies still carrying the demo placeholder for the approved
 * wording. Seeding only fills gaps, so without this a database created before
 * the wording arrived would keep the placeholder. Anything edited in the admin
 * no longer matches the placeholder and is left as it is.
 */
async function replacePlaceholderPolicies() {
  const store = await getStore();
  const updated = [];

  for (const doc of await store.listDocs('policies')) {
    if (doc.body !== PLACEHOLDER_POLICY_BODY) continue;
    const slug = RENAMED_POLICIES[doc.slug] ?? doc.slug;
    const approved = COLLECTIONS.policies.find((p) => p.slug === slug);
    if (!approved) continue;
    await store.mergeDoc('policies', doc.id, {
      slug: approved.slug,
      title: approved.title,
      body: approved.body,
    });
    updated.push(approved.slug);
  }

  return updated;
}

/**
 * Content supplied after a site went live. Seeding only fills empty
 * collections, so each of these is applied to an existing database once and
 * recorded; after that the admin owns the data, and a centre deleted or an
 * address cleared there stays that way across restarts.
 */
const ADMIN_SETTINGS = 'admin_settings';
const APPLIED = 'content-updates';

const CONTENT_UPDATES = {
  /** The recruiting site list and each site's registration address. */
  'centres-2026-10': async (store) => {
    const key = (name) => String(name ?? '').trim().toLowerCase();
    const stored = await store.listDocs('centres');
    const byName = new Map(stored.map((c) => [key(c.name), c]));

    for (const seed of COLLECTIONS.centres) {
      const current = byName.get(key(seed.name));
      if (!current) {
        await store.addDoc('centres', structuredClone(seed));
        continue;
      }
      // Only fill what is missing; anything typed in the admin wins.
      const patch = {};
      if (!current.email) patch.email = seed.email;
      if (!current.region) patch.region = seed.region;
      if (Object.keys(patch).length) await store.mergeDoc('centres', current.id, patch);
    }
  },

  /** Where contact-form enquiries go, and the address shown beside the form. */
  'general-contact-2026-10': async (store) => {
    const settings = await store.getDoc(ADMIN_SETTINGS, 'enquiries');
    if (!settings?.notifyEmail) {
      await store.setDoc(ADMIN_SETTINGS, 'enquiries', { ...enquirySettings });
    }
    const contact = await store.getDoc(CONTENT, 'contact');
    if (contact && contact.generalEmail === undefined) {
      const { generalEmail, generalEmailLabel } = SINGLETONS.contact;
      await store.mergeDoc(CONTENT, 'contact', { generalEmail, generalEmailLabel });
    }
  },
};

async function applyContentUpdates() {
  const store = await getStore();
  const record = await store.getDoc(ADMIN_SETTINGS, APPLIED);
  const done = new Set(record?.applied ?? []);
  const applied = [];

  for (const [name, update] of Object.entries(CONTENT_UPDATES)) {
    if (done.has(name)) continue;
    await update(store);
    done.add(name);
    applied.push(name);
  }

  if (applied.length) await store.setDoc(ADMIN_SETTINGS, APPLIED, { applied: [...done] });
  return applied;
}

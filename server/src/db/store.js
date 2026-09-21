/**
 * Thin persistence layer with two interchangeable backends:
 *
 *   - Firestore  (production on Cloud Run — set USE_FIRESTORE=true)
 *   - JSON file  (local development, no GCP credentials required)
 *
 * Both expose the same small document/collection API used by the services,
 * so nothing above this module knows which one is active.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';

const now = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* JSON-file backend                                                   */
/* ------------------------------------------------------------------ */

class FileStore {
  constructor(file) {
    this.file = file;
    this.data = null;
    this.queue = Promise.resolve();
  }

  async load() {
    if (this.data) return this.data;
    try {
      this.data = JSON.parse(await readFile(this.file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      this.data = {};
    }
    return this.data;
  }

  /** Serialise writes so concurrent requests cannot clobber the file. */
  async flush() {
    this.queue = this.queue.then(async () => {
      await mkdir(dirname(this.file), { recursive: true });
      await writeFile(this.file, JSON.stringify(this.data, null, 2));
    });
    return this.queue;
  }

  async getDoc(collection, id) {
    const data = await this.load();
    return data[collection]?.[id] ?? null;
  }

  async setDoc(collection, id, value) {
    const data = await this.load();
    data[collection] ??= {};
    const prev = data[collection][id];
    data[collection][id] = {
      ...value,
      id,
      createdAt: prev?.createdAt ?? now(),
      updatedAt: now(),
    };
    await this.flush();
    return data[collection][id];
  }

  async mergeDoc(collection, id, patch) {
    const current = (await this.getDoc(collection, id)) ?? {};
    return this.setDoc(collection, id, { ...current, ...patch });
  }

  async listDocs(collection) {
    const data = await this.load();
    return Object.values(data[collection] ?? {});
  }

  async addDoc(collection, value) {
    return this.setDoc(collection, value.id ?? randomUUID(), value);
  }

  async deleteDoc(collection, id) {
    const data = await this.load();
    if (!data[collection]?.[id]) return false;
    delete data[collection][id];
    await this.flush();
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* Firestore backend                                                   */
/* ------------------------------------------------------------------ */

class FirestoreStore {
  constructor(db) {
    this.db = db;
  }

  static async create() {
    const { Firestore } = await import('@google-cloud/firestore');
    const db = new Firestore({
      projectId: config.firestore.projectId || undefined,
      databaseId: config.firestore.databaseId,
      ignoreUndefinedProperties: true,
    });
    return new FirestoreStore(db);
  }

  async getDoc(collection, id) {
    const snap = await this.db.collection(collection).doc(id).get();
    return snap.exists ? { ...snap.data(), id: snap.id } : null;
  }

  async setDoc(collection, id, value) {
    const ref = this.db.collection(collection).doc(id);
    const existing = await ref.get();
    const payload = {
      ...value,
      id,
      createdAt: existing.exists ? (existing.data().createdAt ?? now()) : now(),
      updatedAt: now(),
    };
    await ref.set(payload);
    return payload;
  }

  async mergeDoc(collection, id, patch) {
    const current = (await this.getDoc(collection, id)) ?? {};
    return this.setDoc(collection, id, { ...current, ...patch });
  }

  async listDocs(collection) {
    const snap = await this.db.collection(collection).get();
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  }

  async addDoc(collection, value) {
    return this.setDoc(collection, value.id ?? randomUUID(), value);
  }

  async deleteDoc(collection, id) {
    const ref = this.db.collection(collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  }
}

/* ------------------------------------------------------------------ */

let storePromise;

export function getStore() {
  storePromise ??= config.firestore.enabled
    ? FirestoreStore.create()
    : Promise.resolve(new FileStore(config.dataFile));
  return storePromise;
}

export const storeBackend = () => (config.firestore.enabled ? 'firestore' : 'file');

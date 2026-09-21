/**
 * Image uploads. Writes to a Google Cloud Storage bucket in production and to
 * a local directory in development, returning a public URL either way.
 */
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { getStore } from '../db/store.js';

const MEDIA = 'media';

export const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
]);

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

let bucketPromise;
async function getBucket() {
  bucketPromise ??= (async () => {
    const { Storage } = await import('@google-cloud/storage');
    return new Storage({ projectId: config.firestore.projectId || undefined }).bucket(
      config.storage.bucket,
    );
  })();
  return bucketPromise;
}

function safeName(original, mime) {
  const ext = EXT_BY_MIME[mime] ?? extname(original).toLowerCase() ?? '';
  const base = original
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'image'}-${randomUUID().slice(0, 8)}${ext}`;
}

export async function uploadImage({ buffer, originalname, mimetype, alt = '', uploadedBy = '' }) {
  if (!ALLOWED_MIME.has(mimetype)) {
    throw Object.assign(new Error(`Unsupported image type: ${mimetype}`), { status: 415 });
  }
  const filename = safeName(originalname, mimetype);
  const objectPath = `media/${filename}`;
  let url;

  if (config.storage.enabled) {
    const bucket = await getBucket();
    const file = bucket.file(objectPath);
    await file.save(buffer, {
      contentType: mimetype,
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });
    url = config.storage.publicBaseUrl
      ? `${config.storage.publicBaseUrl.replace(/\/$/, '')}/${objectPath}`
      : `https://storage.googleapis.com/${config.storage.bucket}/${objectPath}`;
  } else {
    await mkdir(join(config.storage.localDir, 'media'), { recursive: true });
    await writeFile(join(config.storage.localDir, objectPath), buffer);
    url = `/uploads/${objectPath}`;
  }

  const store = await getStore();
  return store.addDoc(MEDIA, {
    filename,
    objectPath,
    url,
    src: url,
    alt,
    mimetype,
    size: buffer.length,
    uploadedBy,
  });
}

export async function listMedia() {
  const store = await getStore();
  return (await store.listDocs(MEDIA)).sort((a, b) =>
    String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')),
  );
}

export async function updateMedia(id, patch) {
  const store = await getStore();
  const current = await store.getDoc(MEDIA, id);
  if (!current) throw Object.assign(new Error('Not found'), { status: 404 });
  return store.mergeDoc(MEDIA, id, { alt: patch.alt ?? current.alt });
}

export async function deleteMedia(id) {
  const store = await getStore();
  const item = await store.getDoc(MEDIA, id);
  if (!item) throw Object.assign(new Error('Not found'), { status: 404 });

  try {
    if (config.storage.enabled) {
      const bucket = await getBucket();
      await bucket.file(item.objectPath).delete({ ignoreNotFound: true });
    } else {
      await unlink(join(config.storage.localDir, item.objectPath)).catch((e) => {
        if (e.code !== 'ENOENT') throw e;
      });
    }
  } catch (err) {
    // The database record is the source of truth for the admin UI; a failed
    // blob delete should not strand the record, so log and carry on.
    console.error(`Failed to delete blob ${item.objectPath}:`, err.message);
  }

  await store.deleteDoc(MEDIA, id);
  return { id, deleted: true };
}

/**
 * Postgres backend, used with Neon in production.
 *
 * The content model is genuinely document-shaped — a hero section is nested
 * arrays of paragraphs, buttons and images, not rows — so documents are stored
 * as JSONB in one table keyed by (collection, id). That keeps the same small
 * document interface the other backends implement, while still giving real
 * transactions, SQL access and backups.
 *
 * The rows stay queryable from SQL: the GIN index supports containment
 * queries, and the expression indexes cover the fields the app filters on.
 * For example, to read the enquiry inbox straight from psql:
 *
 *   SELECT data->>'name', data->>'email', data->>'status', created_at
 *   FROM documents WHERE collection = 'enquiries' ORDER BY created_at DESC;
 */
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS documents (
  collection  text        NOT NULL,
  id          text        NOT NULL,
  data        jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS documents_collection_idx ON documents (collection);
CREATE INDEX IF NOT EXISTS documents_data_idx ON documents USING gin (data jsonb_path_ops);

-- Ordering and publish filters run on every public request.
CREATE INDEX IF NOT EXISTS documents_order_idx
  ON documents (collection, ((data->>'order')::int));
CREATE INDEX IF NOT EXISTS documents_published_idx
  ON documents (collection) WHERE data->>'published' <> 'false';

-- Slugs are looked up directly by the public trial and policy routes.
CREATE INDEX IF NOT EXISTS documents_slug_idx ON documents (collection, (data->>'slug'));
`;

const iso = (value) => (value instanceof Date ? value.toISOString() : value);

/** Merge the row's timestamp columns back into the document the app sees. */
const hydrate = (row) =>
  row ? { ...row.data, id: row.id, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) } : null;

/** Timestamps and id live in columns, so strip them from the JSONB payload. */
const stripMeta = ({ id, createdAt, updatedAt, ...rest }) => rest;

export class PostgresStore {
  constructor(pool) {
    this.pool = pool;
  }

  static async create() {
    const { default: pg } = await import('pg');

    if (!config.database.url) {
      throw new Error('DATABASE_URL is required when USE_POSTGRES=true');
    }

    const pool = new pg.Pool({
      connectionString: config.database.url,
      // Neon terminates TLS at its proxy with a certificate the default Node
      // trust store accepts; keep verification on unless explicitly disabled.
      ssl: config.database.ssl ? { rejectUnauthorized: true } : false,
      // Cloud Run runs many small instances, so each keeps few connections.
      // Point DATABASE_URL at Neon's -pooler host so PgBouncer fans these in.
      max: config.database.poolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    pool.on('error', (err) => console.error('Postgres pool error:', err.message));

    const store = new PostgresStore(pool);
    await store.migrate();
    return store;
  }

  /** Create the table and indexes. Safe to run on every boot. */
  async migrate() {
    await this.pool.query(SCHEMA);
  }

  async getDoc(collection, id) {
    const { rows } = await this.pool.query(
      'SELECT id, data, created_at, updated_at FROM documents WHERE collection = $1 AND id = $2',
      [collection, id],
    );
    return hydrate(rows[0]);
  }

  async setDoc(collection, id, value) {
    const { rows } = await this.pool.query(
      `INSERT INTO documents (collection, id, data)
            VALUES ($1, $2, $3)
       ON CONFLICT (collection, id)
       DO UPDATE SET data = $3, updated_at = now()
         RETURNING id, data, created_at, updated_at`,
      [collection, id, JSON.stringify(stripMeta(value))],
    );
    return hydrate(rows[0]);
  }

  async mergeDoc(collection, id, patch) {
    // Merge inside the database so concurrent edits to different fields of the
    // same document cannot clobber each other via a read-modify-write race.
    const { rows } = await this.pool.query(
      `UPDATE documents
          SET data = data || $3::jsonb, updated_at = now()
        WHERE collection = $1 AND id = $2
    RETURNING id, data, created_at, updated_at`,
      [collection, id, JSON.stringify(stripMeta(patch))],
    );
    if (rows[0]) return hydrate(rows[0]);
    // No such row yet — fall back to an insert so merge behaves like upsert.
    return this.setDoc(collection, id, patch);
  }

  async listDocs(collection) {
    const { rows } = await this.pool.query(
      'SELECT id, data, created_at, updated_at FROM documents WHERE collection = $1',
      [collection],
    );
    return rows.map(hydrate);
  }

  async addDoc(collection, value) {
    return this.setDoc(collection, value.id ?? randomUUID(), value);
  }

  async deleteDoc(collection, id) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM documents WHERE collection = $1 AND id = $2',
      [collection, id],
    );
    return rowCount > 0;
  }

  async close() {
    await this.pool.end();
  }
}

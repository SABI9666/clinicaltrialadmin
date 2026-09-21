/**
 * Runs the same API surface against a real Postgres database.
 *
 * Skipped unless TEST_DATABASE_URL is set, so `npm test` still works with no
 * database available. CI and local runs against Neon or a local Postgres set
 * it to exercise the production storage path.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';

const DSN = process.env.TEST_DATABASE_URL;

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-tests';
process.env.ADMIN_EMAIL = 'pg-tester@example.com';
process.env.ADMIN_PASSWORD = 'test-password-12345';
process.env.USE_FIRESTORE = 'false';
process.env.USE_GCS = 'false';
process.env.LOCAL_UPLOAD_DIR = '.data/pg-test-uploads';

if (DSN) {
  process.env.USE_POSTGRES = 'true';
  process.env.DATABASE_URL = DSN;
  // A local test server has no TLS; Neon requires it.
  process.env.DATABASE_SSL = /localhost|127\.0\.0\.1|\/tmp/.test(DSN) ? 'false' : 'true';
}

describe('postgres backend', { skip: DSN ? false : 'TEST_DATABASE_URL not set' }, () => {
  let server;
  let base;
  let token;
  let store;

  const api = (path, init = {}) =>
    fetch(`${base}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init.auth ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

  before(async () => {
    const { getStore } = await import('../src/db/store.js');
    store = await getStore();

    // Start from a clean database so counts are deterministic.
    await store.pool.query('TRUNCATE documents');

    const { seedIfEmpty } = await import('../src/services/content.service.js');
    const { ensureBootstrapAdmin } = await import('../src/services/users.service.js');
    const { createApp } = await import('../src/app.js');

    await seedIfEmpty();
    await ensureBootstrapAdmin();

    server = createApp().listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;

    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'pg-tester@example.com', password: 'test-password-12345' }),
    });
    ({ token } = await res.json());
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (store?.close) await store.close();
  });

  test('reports the postgres backend', async () => {
    const health = await (await api('/healthz')).json();
    assert.equal(health.store, 'postgres');
  });

  test('created the documents table with its indexes', async () => {
    const { rows } = await store.pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'documents' ORDER BY indexname`,
    );
    const names = rows.map((r) => r.indexname);
    for (const expected of [
      'documents_collection_idx',
      'documents_data_idx',
      'documents_order_idx',
      'documents_published_idx',
      'documents_slug_idx',
    ]) {
      assert.ok(names.includes(expected), `missing index ${expected}`);
    }
  });

  test('seeded the content', async () => {
    const site = await (await api('/api/public/site')).json();
    assert.deepEqual(site.hero.titleLines, ['Helping you access', 'clinical trials.']);
    assert.equal(site.trials.length, 1);
    assert.equal(site.faqs.length, 5);
    assert.equal(site.policies.length, 3);
  });

  test('signs in', () => {
    assert.ok(token && token.length > 20);
  });

  test('round-trips a trial through create, filter, update and delete', async () => {
    const created = await (
      await api('/api/admin/collections/trials', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          slug: 'pg-trial',
          title: 'Postgres Trial',
          condition: 'Vaccines',
          published: true,
        }),
      })
    ).json();
    assert.ok(created.id);

    const filtered = await (await api('/api/public/trials?condition=Vaccines')).json();
    assert.deepEqual(
      filtered.map((t) => t.slug),
      ['pg-trial'],
    );

    const renamed = await (
      await api(`/api/admin/collections/trials/${created.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ title: 'Renamed' }),
      })
    ).json();
    assert.equal(renamed.title, 'Renamed');
    // A partial update must not drop the fields it did not mention.
    assert.equal(renamed.condition, 'Vaccines');
    assert.equal(renamed.slug, 'pg-trial');

    await api(`/api/admin/collections/trials/${created.id}`, { method: 'PUT', auth: true, body: JSON.stringify({ published: false }) });
    const publicTrials = await (await api('/api/public/trials')).json();
    assert.ok(!publicTrials.some((t) => t.id === created.id), 'unpublished trial must be hidden');

    const deleted = await (
      await api(`/api/admin/collections/trials/${created.id}`, { method: 'DELETE', auth: true })
    ).json();
    assert.equal(deleted.deleted, true);
  });

  test('persists a section edit and resets it', async () => {
    await api('/api/admin/sections/about', {
      method: 'PUT',
      auth: true,
      body: JSON.stringify({ title: 'Edited in Postgres' }),
    });
    const edited = await (await api('/api/public/sections/about')).json();
    assert.equal(edited.title, 'Edited in Postgres');

    const reset = await (
      await api('/api/admin/sections/about/reset', { method: 'POST', auth: true })
    ).json();
    assert.equal(reset.title, 'About Clinical Trial Access');
  });

  test('stores an enquiry and drops a honeypot submission', async () => {
    const ok = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane',
        country: 'Australia',
        email: 'jane@example.com',
        message: 'Please tell me more.',
      }),
    });
    assert.equal(ok.status, 201);

    const bot = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bot',
        country: 'AU',
        email: 'bot@example.com',
        message: 'spam',
        company: 'filled-in',
      }),
    });
    assert.equal(bot.status, 202);

    const stats = await (await api('/api/admin/enquiries/stats', { auth: true })).json();
    assert.equal(stats.total, 1, 'only the genuine enquiry should be stored');
  });

  test('enquiries are readable as plain SQL', async () => {
    const { rows } = await store.pool.query(
      `SELECT data->>'name' AS name, data->>'email' AS email, data->>'status' AS status
         FROM documents WHERE collection = 'enquiries'`,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Jane');
    assert.equal(rows[0].status, 'new');
  });

  test('merges concurrent field updates without clobbering', async () => {
    const created = await (
      await api('/api/admin/collections/faqs', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ question: 'Concurrent?', answer: 'Original answer' }),
      })
    ).json();

    // Two updates to different fields, issued together.
    await Promise.all([
      api(`/api/admin/collections/faqs/${created.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ answer: 'Updated answer' }),
      }),
      api(`/api/admin/collections/faqs/${created.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ published: false }),
      }),
    ]);

    const after = await (
      await api('/api/admin/collections/faqs', { auth: true })
    ).json();
    const faq = after.find((f) => f.id === created.id);
    assert.equal(faq.question, 'Concurrent?', 'question must survive both updates');
  });

  test('keeps created_at stable across updates', async () => {
    const before = await (await api('/api/public/sections/contact')).json();
    await api('/api/admin/sections/contact', {
      method: 'PUT',
      auth: true,
      body: JSON.stringify({ ...before, title: 'Touched' }),
    });
    const { rows } = await store.pool.query(
      `SELECT created_at, updated_at FROM documents WHERE collection='content' AND id='contact'`,
    );
    assert.ok(rows[0].updated_at >= rows[0].created_at);
  });
});

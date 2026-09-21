/**
 * End-to-end API tests against the file-backed store.
 * Run with: npm test
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-tests';
process.env.DATA_FILE = '.data/test-store.json';
process.env.LOCAL_UPLOAD_DIR = '.data/test-uploads';
process.env.ADMIN_EMAIL = 'tester@example.com';
process.env.ADMIN_PASSWORD = 'test-password-12345';
process.env.USE_FIRESTORE = 'false';
process.env.USE_GCS = 'false';

const { createApp } = await import('../src/app.js');
const { seedIfEmpty } = await import('../src/services/content.service.js');
const { ensureBootstrapAdmin } = await import('../src/services/users.service.js');

let server;
let base;
let token;

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
  await rm('.data/test-store.json', { force: true });
  await rm('.data/test-uploads', { force: true, recursive: true });
  await seedIfEmpty();
  await ensureBootstrapAdmin();

  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;

  const res = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'tester@example.com', password: 'test-password-12345' }),
  });
  ({ token } = await res.json());
});

after(async () => {
  await new Promise((r) => server.close(r));
  await rm('.data/test-store.json', { force: true });
  await rm('.data/test-uploads', { force: true, recursive: true });
});

describe('health', () => {
  test('reports ok on /healthz', async () => {
    const res = await api('/healthz');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });

  // Cloud Run's frontend swallows /healthz, so the deployed health check has
  // to live under /api. Both must answer identically.
  test('reports ok on /api/health', async () => {
    const res = await api('/api/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.store, 'should report which store backend is active');
  });
});

describe('auth', () => {
  test('issues a token for valid credentials', () => {
    assert.ok(token && token.length > 20);
  });

  test('rejects a wrong password', async () => {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'tester@example.com', password: 'nope' }),
    });
    assert.equal(res.status, 401);
  });

  test('rejects an unknown email', async () => {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ghost@example.com', password: 'test-password-12345' }),
    });
    assert.equal(res.status, 401);
  });

  test('guards admin routes', async () => {
    assert.equal((await api('/api/admin/collections/trials')).status, 401);
  });

  test('rejects a malformed token', async () => {
    const res = await api('/api/admin/collections/trials', {
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    assert.equal(res.status, 401);
  });
});

describe('public content', () => {
  test('returns every section and collection in one payload', async () => {
    const site = await (await api('/api/public/site')).json();
    for (const key of ['settings', 'hero', 'journey', 'why', 'about', 'contact', 'footer']) {
      assert.ok(site[key], `missing section ${key}`);
    }
    assert.equal(site.trials.length, 1);
    assert.equal(site.faqs.length, 5);
    assert.equal(site.reports.length, 2);
    assert.equal(site.policies.length, 3);
  });

  test('hero keeps the copy from the source page', async () => {
    const hero = await (await api('/api/public/sections/hero')).json();
    assert.deepEqual(hero.titleLines, ['Helping you access', 'clinical trials.']);
    assert.equal(hero.trust.length, 3);
  });

  test('404s an unknown section', async () => {
    assert.equal((await api('/api/public/sections/nope')).status, 404);
  });
});

describe('trial filtering', () => {
  test('matches on condition', async () => {
    const res = await api('/api/public/trials?condition=Diabetes');
    const trials = await res.json();
    assert.equal(trials.length, 1);
    assert.equal(trials[0].slug, 'diabetic-foot-ulcers');
  });

  test('excludes a non-matching condition', async () => {
    const trials = await (await api('/api/public/trials?condition=Vaccines')).json();
    assert.equal(trials.length, 0);
  });

  test('keeps trials whose facet is unconfirmed', async () => {
    // The seeded trial records no state, so a state filter must not hide it.
    const trials = await (await api('/api/public/trials?state=Queensland')).json();
    assert.equal(trials.length, 1);
  });

  test('fetches a trial by slug', async () => {
    const trial = await (await api('/api/public/trials/diabetic-foot-ulcers')).json();
    assert.equal(trial.title, 'Diabetic Foot Ulcers');
    assert.equal(trial.detail.tag, 'INVESTIGATIONAL TREATMENT · CYWC628');
  });

  test('404s an unknown slug', async () => {
    assert.equal((await api('/api/public/trials/does-not-exist')).status, 404);
  });
});

describe('admin trial CRUD', () => {
  let id;

  test('creates a trial', async () => {
    const res = await api('/api/admin/collections/trials', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({
        slug: 'test-trial',
        title: 'Test Trial',
        condition: 'Oncology',
        published: true,
      }),
    });
    assert.equal(res.status, 201);
    ({ id } = await res.json());
    assert.ok(id);
  });

  test('rejects an invalid slug', async () => {
    const res = await api('/api/admin/collections/trials', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ slug: 'Not A Slug', title: 'x' }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'Validation failed');
  });

  test('updates a trial', async () => {
    const res = await api(`/api/admin/collections/trials/${id}`, {
      method: 'PUT',
      auth: true,
      body: JSON.stringify({ title: 'Renamed Trial' }),
    });
    assert.equal((await res.json()).title, 'Renamed Trial');
  });

  test('hides an unpublished trial from the public API', async () => {
    await api(`/api/admin/collections/trials/${id}`, {
      method: 'PUT',
      auth: true,
      body: JSON.stringify({ published: false }),
    });
    const trials = await (await api('/api/public/trials')).json();
    assert.ok(!trials.some((t) => t.id === id));
  });

  test('deletes a trial', async () => {
    const res = await api(`/api/admin/collections/trials/${id}`, { method: 'DELETE', auth: true });
    assert.equal((await res.json()).deleted, true);
    assert.equal(
      (await api(`/api/admin/collections/trials/${id}`, { method: 'DELETE', auth: true })).status,
      404,
    );
  });
});

describe('sections', () => {
  test('saves and resets a section', async () => {
    const edited = await (
      await api('/api/admin/sections/insights', {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ title: 'Edited title' }),
      })
    ).json();
    assert.equal(edited.title, 'Edited title');

    const reset = await (
      await api('/api/admin/sections/insights/reset', { method: 'POST', auth: true })
    ).json();
    assert.equal(reset.title, 'Understanding clinical trials');
  });
});

describe('enquiries', () => {
  test('accepts a valid enquiry', async () => {
    const res = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane',
        country: 'Australia',
        email: 'jane@example.com',
        message: 'Please tell me more.',
      }),
    });
    assert.equal(res.status, 201);
  });

  test('rejects a bad email', async () => {
    const res = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify({ name: 'J', country: 'AU', email: 'not-an-email', message: 'hi' }),
    });
    assert.equal(res.status, 400);
  });

  test('silently drops a honeypot submission', async () => {
    const before = (await (await api('/api/admin/enquiries/stats', { auth: true })).json()).total;
    const res = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bot',
        country: 'AU',
        email: 'bot@example.com',
        message: 'spam',
        company: 'filled-in',
      }),
    });
    assert.equal(res.status, 202);
    const after = (await (await api('/api/admin/enquiries/stats', { auth: true })).json()).total;
    assert.equal(after, before, 'honeypot submission must not be stored');
  });

  test('lists enquiries for an admin only', async () => {
    assert.equal((await api('/api/admin/enquiries')).status, 401);
    const list = await (await api('/api/admin/enquiries', { auth: true })).json();
    assert.ok(list.length >= 1);
    assert.equal(list[0].status, 'new');
  });
});

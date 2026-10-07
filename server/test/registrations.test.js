/**
 * Trial registrations, end to end.
 *
 * The unit tests in mail.test.js cover how a message is addressed. These cover
 * the promise made to the person filling the form: their details reach the
 * centre they picked and are written nowhere, and the centre's address is
 * never handed to the browser.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-tests';
process.env.DATA_FILE = '.data/registrations-test.json';
process.env.LOCAL_UPLOAD_DIR = '.data/registrations-test-uploads';
process.env.ADMIN_EMAIL = 'tester@example.com';
process.env.ADMIN_PASSWORD = 'test-password-12345';
process.env.USE_FIRESTORE = 'false';
process.env.USE_POSTGRES = 'false';
process.env.USE_GCS = 'false';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.MAIL_FROM = 'registrations@example.org';

const { createApp } = await import('../src/app.js');
const { seedIfEmpty } = await import('../src/services/content.service.js');
const { ensureBootstrapAdmin } = await import('../src/services/users.service.js');
const { getStore } = await import('../src/db/store.js');

let server;
let base;
let token;
let trialSlug;
let centreId;
let otherCentreId;

/* Every message Resend was asked to send, and what the next send should do. */
const sent = [];
let resendFails = false;
const realFetch = globalThis.fetch;

globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith('https://api.resend.com')) return realFetch(url, init);
  if (resendFails) {
    return { ok: false, status: 422, json: async () => ({ message: 'domain is not verified' }) };
  }
  sent.push(JSON.parse(init.body));
  return { ok: true, status: 200, json: async () => ({ id: `msg_${sent.length}` }) };
};

const api = (path, init = {}) =>
  realFetch(`${base}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.auth ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

const post = (path, body, init = {}) =>
  api(path, { ...init, method: 'POST', body: JSON.stringify(body) });

/** A registration that passes validation, overridable per test. */
const registration = (patch = {}) => ({
  trialSlug,
  centreId,
  consent: true,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '+61 400 000 000',
  answers: [{ question: 'Have you had treatment before?', answer: 'No' }],
  ...patch,
});

before(async () => {
  await rm('.data/registrations-test.json', { force: true });
  await rm('.data/registrations-test-uploads', { force: true, recursive: true });
  await seedIfEmpty();
  await ensureBootstrapAdmin();

  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;

  ({ token } = await (
    await post('/api/auth/login', {
      email: 'tester@example.com',
      password: 'test-password-12345',
    })
  ).json());

  const centre = async (value) =>
    (await post('/api/admin/collections/centres', value, { auth: true })).json();

  ({ id: centreId } = await centre({
    name: 'Melbourne Research Centre',
    email: 'centre@example.org',
    region: 'Victoria',
    published: true,
  }));
  ({ id: otherCentreId } = await centre({
    name: 'Sydney Research Centre',
    email: 'sydney@example.org',
    published: true,
  }));

  const trials = await (await api('/api/public/trials')).json();
  trialSlug = trials[0].slug;
});

after(async () => {
  globalThis.fetch = realFetch;
  await new Promise((r) => server.close(r));
  await rm('.data/registrations-test.json', { force: true });
  await rm('.data/registrations-test-uploads', { force: true, recursive: true });
});

describe('centre addresses stay on the server', () => {
  test('the public site lists centres without their email', async () => {
    const site = await (await api('/api/public/site')).json();
    const centre = site.centres.find((c) => c.id === centreId);

    assert.ok(centre, 'the centre should be offered to the site');
    assert.equal(centre.name, 'Melbourne Research Centre');
    assert.equal(centre.region, 'Victoria');
    assert.equal(centre.email, undefined, 'the address must never reach the browser');
    assert.equal(
      JSON.stringify(site).includes('centre@example.org'),
      false,
      'no response the browser gets may carry a centre inbox',
    );
  });

  test('the admin still sees the address it has to edit', async () => {
    const centres = await (await api('/api/admin/collections/centres', { auth: true })).json();
    assert.equal(centres.find((c) => c.id === centreId).email, 'centre@example.org');
  });

  test('an unpublished centre cannot be registered for', async () => {
    const hidden = await (
      await post(
        '/api/admin/collections/centres',
        { name: 'Draft Centre', email: 'draft@example.org', published: false },
        { auth: true },
      )
    ).json();

    const site = await (await api('/api/public/site')).json();
    assert.equal(site.centres.some((c) => c.id === hidden.id), false);
    assert.equal((await post('/api/public/registrations', registration({ centreId: hidden.id }))).status, 400);
  });
});

describe('delivery', () => {
  test('emails the chosen centre with the full details', async () => {
    const before = sent.length;
    assert.equal((await post('/api/public/registrations', registration())).status, 201);

    assert.equal(sent.length, before + 1);
    const mail = sent.at(-1);
    assert.deepEqual(mail.to, ['centre@example.org'], 'goes to the centre chosen, by id');
    assert.deepEqual(mail.reply_to, ['ada@example.com'], 'the centre can reply to the registrant');

    for (const value of ['Ada', 'Lovelace', 'ada@example.com', '+61 400 000 000']) {
      assert.ok(mail.text.includes(value), `the email should carry ${value}`);
    }
    assert.ok(mail.text.includes('Have you had treatment before?'));
  });

  test('stores nothing a person typed, anywhere', async () => {
    await post('/api/public/registrations', registration({ email: 'unique-canary@example.com' }));

    const store = await getStore();
    for (const collection of ['registrations', 'enquiries', 'centres', 'trials']) {
      const serialised = JSON.stringify(await store.listDocs(collection));
      for (const value of ['unique-canary@example.com', 'Lovelace', '+61 400 000 000']) {
        assert.equal(
          serialised.includes(value),
          false,
          `${collection} must not hold the registrant's ${value}`,
        );
      }
    }
  });

  test('records that it happened, so a lost one can be noticed', async () => {
    const store = await getStore();
    const latest = (await store.listDocs('registrations')).at(-1);

    assert.equal(latest.delivery, 'sent');
    assert.equal(latest.trialSlug, trialSlug);
    assert.equal(latest.centreId, centreId);
  });

  test('tells the person plainly when the send fails', async () => {
    resendFails = true;
    const res = await post('/api/public/registrations', registration());
    resendFails = false;

    assert.equal(res.status, 502);
    assert.match(
      (await res.json()).error,
      /could not be sent/i,
      'a failed send must not be dressed up as a thank-you',
    );

    const store = await getStore();
    const failed = (await store.listDocs('registrations')).filter((r) => r.delivery === 'failed');
    assert.equal(failed.length, 1, 'and it should be recorded for someone to notice');
    assert.equal(JSON.stringify(failed).includes('ada@example.com'), false);
  });
});

describe('what the form refuses', () => {
  test('a registration without consent', async () => {
    assert.equal((await post('/api/public/registrations', registration({ consent: false }))).status, 400);
  });

  test('a missing name or a malformed email', async () => {
    for (const patch of [{ firstName: '' }, { email: 'not-an-email' }]) {
      const res = await post('/api/public/registrations', registration(patch));
      assert.equal(res.status, 400, `${JSON.stringify(patch)} should be rejected`);
    }
  });

  test('an unknown centre', async () => {
    assert.equal((await post('/api/public/registrations', registration({ centreId: 'nope' }))).status, 400);
  });

  test('a centre that does not recruit for this trial', async () => {
    const trials = await (await api('/api/admin/collections/trials', { auth: true })).json();
    const trial = trials.find((t) => t.slug === trialSlug);
    const save = (centreIds) =>
      api(`/api/admin/collections/trials/${trial.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ ...trial, centreIds }),
      });

    await save([centreId]);
    const before = sent.length;
    const res = await post('/api/public/registrations', registration({ centreId: otherCentreId }));

    assert.equal(res.status, 400, 'a centre outside the trial must not be accepted');
    assert.equal(sent.length, before, 'and nothing should have been emailed');

    await save([]); // so the restriction does not leak into later tests
  });

  test('a bot, silently — it learns nothing from the reply', async () => {
    const before = sent.length;
    const res = await post('/api/public/registrations', registration({ company: 'Spam Co' }));

    assert.equal(res.status, 202);
    assert.equal(sent.length, before, 'and no centre should be emailed');
  });

  // Last, because it deliberately spends what is left of this address's hourly
  // budget. Every request carries the honeypot, so no centre is emailed.
  test('a flood from one address, once the hourly limit is spent', async () => {
    let status = 0;
    for (let i = 0; i < 12 && status !== 429; i += 1) {
      status = (await post('/api/public/registrations', registration({ company: 'flood' }))).status;
    }
    assert.equal(status, 429, 'the limiter should refuse a flood from one address');
  });
});

describe('the admin has no registration inbox', () => {
  test('the log carries no personal field at all', async () => {
    const res = await api('/api/admin/registrations', { auth: true });
    assert.equal(res.status, 200);

    const entries = await res.json();
    assert.ok(entries.length > 0);
    const keys = new Set(entries.flatMap((r) => Object.keys(r)));
    for (const key of ['firstName', 'lastName', 'email', 'phone', 'answers', 'name']) {
      assert.equal(keys.has(key), false, `the log must not carry ${key}`);
    }
  });

  test('the counts add up, and say whether mail is configured', async () => {
    const stats = await (await api('/api/admin/registrations/stats', { auth: true })).json();
    assert.equal(stats.total, stats.sent + stats.failed);
    assert.ok(stats.sent > 0);
    assert.equal(stats.failed, 1);
    assert.equal(stats.mailConfigured, true);
  });

  test('the log needs a signed-in admin', async () => {
    assert.equal((await api('/api/admin/registrations')).status, 401);
  });
});

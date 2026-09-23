/**
 * Contact form enquiries: emailed, never stored.
 *
 * Two promises are under test. Nothing a person writes reaches the database —
 * the email is the only copy — and the address it goes to is an admin-only
 * setting, kept out of the content sections that /api/public/site publishes so
 * the inbox cannot be scraped off the site.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-tests';
process.env.DATA_FILE = '.data/enquiry-notify-test.json';
process.env.LOCAL_UPLOAD_DIR = '.data/enquiry-notify-uploads';
process.env.ADMIN_EMAIL = 'tester@example.com';
process.env.ADMIN_PASSWORD = 'test-password-12345';
process.env.USE_FIRESTORE = 'false';
process.env.USE_POSTGRES = 'false';
process.env.USE_GCS = 'false';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.MAIL_FROM = 'noreply@example.org';

const { createApp } = await import('../src/app.js');
const { seedIfEmpty } = await import('../src/services/content.service.js');
const { ensureBootstrapAdmin } = await import('../src/services/users.service.js');
const { getStore } = await import('../src/db/store.js');

let server;
let base;
let token;

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

const enquiry = (patch = {}) => ({
  name: 'Grace Hopper',
  country: 'Australia',
  email: 'grace@example.com',
  phone: '+61 400 111 222',
  message: 'Could you tell me more about taking part?',
  ...patch,
});

const setAddress = (notifyEmail) =>
  api('/api/admin/enquiries/settings', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ notifyEmail }),
  });

before(async () => {
  await rm('.data/enquiry-notify-test.json', { force: true });
  await rm('.data/enquiry-notify-uploads', { force: true, recursive: true });
  await seedIfEmpty();
  await ensureBootstrapAdmin();

  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;

  ({ token } = await (
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'tester@example.com', password: 'test-password-12345' }),
    })
  ).json());
});

after(async () => {
  globalThis.fetch = realFetch;
  await new Promise((r) => server.close(r));
  await rm('.data/enquiry-notify-test.json', { force: true });
  await rm('.data/enquiry-notify-uploads', { force: true, recursive: true });
});

describe('the notification address', () => {
  test('starts empty and reports whether mail is configured', async () => {
    const s = await (await api('/api/admin/enquiries/settings', { auth: true })).json();
    assert.equal(s.notifyEmail, '');
    assert.equal(s.mailConfigured, true);
  });

  test('is saved and read back', async () => {
    const saved = await (await setAddress('team@example.org')).json();
    assert.equal(saved.notifyEmail, 'team@example.org');

    const read = await (await api('/api/admin/enquiries/settings', { auth: true })).json();
    assert.equal(read.notifyEmail, 'team@example.org');
  });

  test('never appears in anything the public site receives', async () => {
    const site = await (await api('/api/public/site')).text();
    assert.equal(
      site.includes('team@example.org'),
      false,
      'the enquiry inbox must not be in the public payload',
    );
  });

  test('needs a signed-in admin to read or change', async () => {
    assert.equal((await api('/api/admin/enquiries/settings')).status, 401);
    assert.equal(
      (await api('/api/admin/enquiries/settings', { method: 'PUT', body: '{}' })).status,
      401,
    );
  });

  test('refuses something that is not an address', async () => {
    assert.equal((await setAddress('not-an-email')).status, 400);
    const read = await (await api('/api/admin/enquiries/settings', { auth: true })).json();
    assert.equal(read.notifyEmail, 'team@example.org', 'the good value must survive');
  });

  test('is not read as an enquiry id by the router', async () => {
    const res = await api('/api/admin/enquiries/settings', { auth: true });
    assert.equal(res.status, 200);
    assert.ok('notifyEmail' in (await res.json()));
  });
});

describe('an enquiry', () => {
  test('is emailed, with the enquirer in Reply-To', async () => {
    await setAddress('team@example.org');
    const before = sent.length;

    const res = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiry()),
    });
    assert.equal(res.status, 201);

    assert.equal(sent.length, before + 1);
    const mail = sent.at(-1);
    assert.deepEqual(mail.to, ['team@example.org']);
    assert.deepEqual(mail.reply_to, ['grace@example.com'], 'so a reply reaches the enquirer');
    for (const v of ['Grace Hopper', 'grace@example.com', 'Could you tell me more']) {
      assert.ok(mail.text.includes(v), `the email should carry ${v}`);
    }
  });

  test('leaves nothing personal anywhere in the database', async () => {
    await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiry({ email: 'unique-canary@example.com', name: 'Canary Person' })),
    });

    const store = await getStore();
    for (const collection of ['enquiry_deliveries', 'enquiries', 'registrations', 'admin_settings']) {
      const serialised = JSON.stringify(await store.listDocs(collection));
      // Country is excluded from this sweep: it is kept on purpose, and a
      // country name points at no one.
      for (const value of ['unique-canary@example.com', 'Canary Person', 'Could you tell me more']) {
        assert.equal(
          serialised.includes(value),
          false,
          `${collection} must not hold "${value}"`,
        );
      }
    }
  });

  test('is recorded as delivered, with no personal field on the record', async () => {
    const list = await (await api('/api/admin/enquiries', { auth: true })).json();
    assert.ok(list.length > 0);

    // Country is kept deliberately — on its own it identifies nobody, and it
    // answers "where are enquiries coming from" without answering "from whom".
    // Everything that could point at a person stays out.
    const keys = new Set(list.flatMap((r) => Object.keys(r)));
    for (const key of ['name', 'email', 'phone', 'message', 'notes']) {
      assert.equal(keys.has(key), false, `the log must not carry ${key}`);
    }
    assert.equal(list[0].delivery, 'sent');
    assert.equal(typeof list[0].ref, 'number', 'each row carries its reference');
  });

  test('is refused, not silently dropped, when the send fails', async () => {
    resendFails = true;
    const res = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiry({ email: 'ada@example.com' })),
    });
    resendFails = false;

    // Nothing is stored, so a thank-you here would lose the person entirely.
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /could not be sent/i);

    const store = await getStore();
    const failed = (await store.listDocs('enquiry_deliveries')).filter((r) => r.delivery === 'failed');
    assert.equal(failed.length, 1, 'the failure should be recorded for someone to notice');
    assert.equal(JSON.stringify(failed).includes('ada@example.com'), false);
  });

  test('is refused when no address is set, rather than going nowhere', async () => {
    const store = await getStore();
    await store.setDoc('admin_settings', 'enquiries', { notifyEmail: '' });
    const before = sent.length;

    const res = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiry({ email: 'turing@example.com' })),
    });

    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /temporarily unavailable/i);
    assert.equal(sent.length, before);

    await setAddress('team@example.org');
  });

  test('accepts a bot silently and sends nothing', async () => {
    const before = sent.length;
    const res = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiry({ company: 'Spam Co' })),
    });

    assert.equal(res.status, 202, 'a bot should learn nothing from the response');
    assert.equal(sent.length, before);
  });
});

describe('enquiries kept from the old behaviour', () => {
  test('are counted, but their contents are not served', async () => {
    const store = await getStore();
    await store.addDoc('enquiries', {
      name: 'Old Record',
      email: 'old@example.com',
      message: 'Written before the form stopped storing messages',
    });

    const res = await api('/api/admin/enquiries/legacy', { auth: true });
    const summary = await res.json();

    assert.equal(summary.count, 1);
    assert.equal(
      JSON.stringify(summary).includes('old@example.com'),
      false,
      'a summary, not the records — listing them would put the details back on a screen',
    );
  });

  test('are erased on request', async () => {
    const res = await api('/api/admin/enquiries/legacy', { method: 'DELETE', auth: true });
    assert.equal((await res.json()).deleted, 1);

    const store = await getStore();
    assert.equal((await store.listDocs('enquiries')).length, 0);
    assert.equal(
      (await (await api('/api/admin/enquiries/legacy', { auth: true })).json()).count,
      0,
    );
  });

  test('cannot be erased without a signed-in admin', async () => {
    assert.equal((await api('/api/admin/enquiries/legacy', { method: 'DELETE' })).status, 401);
  });
});

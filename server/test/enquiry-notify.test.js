/**
 * Emailing enquiries to a configured address.
 *
 * The address is an admin-only setting on purpose: the site's content sections
 * are all published through /api/public/site, so keeping it out of them is what
 * stops the inbox being scraped. That is the main thing these cover, alongside
 * the rule that a mail failure must never cost someone their enquiry.
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
    // The bad value must not have replaced the good one.
    const read = await (await api('/api/admin/enquiries/settings', { auth: true })).json();
    assert.equal(read.notifyEmail, 'team@example.org');
  });

  test('is not confused with an enquiry id by the router', async () => {
    // '/enquiries/settings' and '/enquiries/:id' share a shape; if the id route
    // were declared first, saving the address would try to update an enquiry.
    const res = await api('/api/admin/enquiries/settings', { auth: true });
    assert.equal(res.status, 200);
    assert.ok('notifyEmail' in (await res.json()));
  });
});

describe('delivering an enquiry', () => {
  test('emails it, with the enquirer in Reply-To', async () => {
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

  test('still records it, so the inbox is not the only copy', async () => {
    const list = await (await api('/api/admin/enquiries', { auth: true })).json();
    const latest = list.find((e) => e.email === 'grace@example.com');
    assert.ok(latest, 'the enquiry should be stored as well as sent');
    assert.equal(latest.delivery, 'sent');
  });

  test('keeps the enquiry when the send fails, and marks it', async () => {
    resendFails = true;
    const res = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiry({ email: 'ada@example.com', name: 'Ada Lovelace' })),
    });
    resendFails = false;

    // A mail problem is ours, not theirs — the person must not be told their
    // message failed when it is safely stored.
    assert.equal(res.status, 201);

    const list = await (await api('/api/admin/enquiries', { auth: true })).json();
    const failed = list.find((e) => e.email === 'ada@example.com');
    assert.ok(failed, 'the enquiry must survive a failed notification');
    assert.equal(failed.delivery, 'failed', 'and be marked so it is noticed');
  });

  test('sends nothing when no address is set, and still records', async () => {
    await setAddress('');
    const before = sent.length;

    const res = await api('/api/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiry({ email: 'turing@example.com', name: 'Alan Turing' })),
    });
    assert.equal(res.status, 201);
    assert.equal(sent.length, before, 'an empty address means notifications are off');

    const list = await (await api('/api/admin/enquiries', { auth: true })).json();
    assert.equal(list.find((e) => e.email === 'turing@example.com').delivery, 'off');
  });
});

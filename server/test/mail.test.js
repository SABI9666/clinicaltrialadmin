import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.RESEND_API_KEY ??= 'test-key';
process.env.MAIL_FROM ??= 'registrations@example.org';
process.env.MAIL_FROM_NAME ??= 'Clinical Trial Access';

const { sendMail, MailError, mailConfigured } = await import('../src/services/mail.service.js');

describe('registration email', () => {
  const realFetch = globalThis.fetch;
  let calls = [];

  before(() => {
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'msg_123' }),
      };
    };
  });

  after(() => {
    globalThis.fetch = realFetch;
  });

  it('is configured from the environment', () => {
    assert.equal(mailConfigured(), true);
  });

  it('posts to Resend with the sender we own and the registrant as reply-to', async () => {
    calls = [];
    const result = await sendMail({
      to: 'coordinator@hospital.example',
      replyTo: 'patient@gmail.example',
      subject: 'New registration — Diabetic Foot Ulcers',
      text: 'body',
    });

    assert.equal(result.id, 'msg_123');
    assert.equal(calls.length, 1);

    const [{ url, init }] = calls;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(init.headers.authorization, 'Bearer test-key');

    const body = JSON.parse(init.body);
    // Sending *as* the registrant would fail SPF/DKIM and land in spam, so the
    // From address must stay a domain we own and the registrant goes in
    // reply_to — pressing Reply at the centre still reaches them.
    assert.equal(body.from, 'Clinical Trial Access <registrations@example.org>');
    assert.deepEqual(body.to, ['coordinator@hospital.example']);
    assert.deepEqual(body.reply_to, ['patient@gmail.example']);
    assert.ok(!JSON.stringify(body.from).includes('gmail'));
  });

  it('omits bcc entirely when none is configured', async () => {
    calls = [];
    await sendMail({ to: 'a@b.example', subject: 's', text: 't' });
    assert.equal('bcc' in JSON.parse(calls[0].init.body), false);
  });

  it('raises MailError when Resend rejects the message', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 422,
      json: async () => ({ message: 'domain is not verified' }),
    });

    await assert.rejects(
      () => sendMail({ to: 'a@b.example', subject: 's', text: 't' }),
      (err) => err instanceof MailError && /domain is not verified/.test(err.message),
    );
  });
});

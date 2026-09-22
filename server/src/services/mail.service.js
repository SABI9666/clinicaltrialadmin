/**
 * Sending mail.
 *
 * Resend is the one provider wired up, reached over plain HTTPS — Cloud Run
 * blocks outbound SMTP ports on the default egress path, so an SMTP client
 * would need a VPC connector and Cloud NAT to work at all. Everything the
 * rest of the app uses goes through `sendMail`, so swapping provider means
 * writing one more `deliver` function, not touching the callers.
 *
 * With no API key configured the send is logged instead. That keeps the whole
 * registration flow runnable locally, and it is reported as an undelivered
 * send rather than a success, so a missing key in production cannot look like
 * a working mailbox.
 */
import { config } from '../config.js';

// Overridable so a test can point it at a local stub. Leave it unset in
// every real environment.
const RESEND_ENDPOINT = process.env.RESEND_ENDPOINT ?? 'https://api.resend.com/emails';

export class MailError extends Error {}

/** `Name <address>` when a display name is configured, bare address if not. */
function fromHeader() {
  const { fromAddress, fromName } = config.mail;
  return fromName ? `${fromName} <${fromAddress}>` : fromAddress;
}

async function deliverWithResend({ to, replyTo, bcc, subject, text, html }) {
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.mail.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: fromHeader(),
      to: [to],
      // The centre replies straight to the person who registered. Sending *as*
      // them is not an option: we do not own their domain, so SPF and DKIM
      // would fail and the mail would land in spam or be rejected outright.
      ...(replyTo ? { reply_to: [replyTo] } : {}),
      ...(bcc ? { bcc: [bcc] } : {}),
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) detail = body.message;
      else if (body?.error) detail = String(body.error);
    } catch {
      /* keep the status line */
    }
    throw new MailError(`Resend rejected the message: ${detail}`);
  }

  const body = await res.json().catch(() => ({}));
  return { id: body?.id ?? '', provider: 'resend' };
}

/** True when a real send would go out, rather than being logged. */
export const mailConfigured = () => Boolean(config.mail.apiKey && config.mail.fromAddress);

/**
 * Send one message. Resolves with the provider's id on success and throws
 * MailError otherwise, so a caller can record the failure and tell the person
 * something honest.
 */
export async function sendMail({ to, replyTo, bcc, subject, text, html }) {
  if (!to) throw new MailError('No recipient address');

  if (!mailConfigured()) {
    console.warn(
      `[mail] Not configured (set RESEND_API_KEY and MAIL_FROM). Would have sent "${subject}" to ${to}.`,
    );
    throw new MailError(
      'Email delivery is not configured on the server, so nothing was sent.',
    );
  }

  return deliverWithResend({ to, replyTo, bcc, subject, text, html });
}

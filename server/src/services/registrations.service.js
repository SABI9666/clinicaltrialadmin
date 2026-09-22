/**
 * Trial registrations.
 *
 * A registration is an email to the recruiting centre the person picked, and
 * nothing more. Their name, contact details and answers are used to compose
 * that message and are then dropped: none of it is written to the database,
 * so the admin console has no personal data to leak, export or have to erase
 * on request.
 *
 * What is stored is a delivery record with no personal data at all — when it
 * happened, which trial, which centre, and whether the email got through.
 * Without it a failed send would vanish silently and nobody would know a
 * registration had been lost.
 */
import { getStore } from '../db/store.js';
import { getCentreForDelivery } from './content.service.js';
import { MailError, sendMail } from './mail.service.js';
import { config } from '../config.js';

const REGISTRATIONS = 'registrations';

const line = (label, value) => `${label}: ${value || '—'}`;

/** The message the centre receives. Plain text: it is read, not admired. */
function composeEmail({ trial, centre, person, answers }) {
  const lines = [
    `A new registration of interest has come in through the website.`,
    '',
    `Trial:  ${trial.title}${trial.slug ? ` (${trial.slug})` : ''}`,
    `Centre: ${centre.name}${centre.region ? ` — ${centre.region}` : ''}`,
    '',
    '--- Contact details ---',
    line('Name', `${person.firstName} ${person.lastName}`.trim()),
    line('Email', person.email),
    line('Phone', person.phone),
  ];

  if (answers.length > 0) {
    lines.push('', '--- Screening answers ---');
    for (const a of answers) lines.push(line(a.question, a.answer));
  }

  lines.push(
    '',
    '--- Consent ---',
    'The person ticked the pre-screening consent box before submitting.',
    '',
    'Reply to this email to contact them directly — it is addressed to them.',
    '',
    'Registering interest does not mean the person is eligible or enrolled.',
    'Eligibility is confirmed by the research team.',
  );

  return {
    subject: `New registration — ${trial.title} (${centre.name})`,
    text: lines.join('\n'),
  };
}

/**
 * Email a registration to its centre, then record that it happened.
 *
 * A delivery failure is recorded and re-thrown, so the person is told their
 * registration did not go through rather than being thanked for nothing.
 */
export async function submitRegistration({ trial, centreId, person, answers }) {
  const centre = await getCentreForDelivery(centreId);
  if (!centre) {
    throw Object.assign(new Error('That centre is no longer available.'), { status: 400 });
  }
  if (!centre.email) {
    throw Object.assign(
      new Error('That centre has no contact address set up yet. Please choose another.'),
      { status: 400 },
    );
  }

  const { subject, text } = composeEmail({ trial, centre, person, answers });

  try {
    const sent = await sendMail({
      to: centre.email,
      replyTo: person.email,
      bcc: config.mail.bcc || undefined,
      subject,
      text,
    });
    await record({ trial, centre, delivery: 'sent', messageId: sent.id });
    return { delivered: true };
  } catch (err) {
    await record({
      trial,
      centre,
      delivery: 'failed',
      error: err instanceof MailError ? err.message : 'Unexpected error while sending',
    });
    throw Object.assign(
      new Error('Your registration could not be sent. Please try again shortly.'),
      { status: 502, expose: true, cause: err },
    );
  }
}

/** Store the fact of a registration — never who made it. */
async function record({ trial, centre, delivery, messageId = '', error = '' }) {
  const store = await getStore();
  return store.addDoc(REGISTRATIONS, {
    trialSlug: trial.slug ?? '',
    trialTitle: trial.title ?? '',
    centreId: centre.id,
    centreName: centre.name ?? '',
    centreRegion: centre.region ?? '',
    delivery,
    messageId,
    error,
  });
}

export async function listRegistrations() {
  const store = await getStore();
  const all = await store.listDocs(REGISTRATIONS);
  return all.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

export async function registrationStats() {
  const all = await listRegistrations();
  return {
    total: all.length,
    sent: all.filter((r) => r.delivery === 'sent').length,
    failed: all.filter((r) => r.delivery === 'failed').length,
  };
}

export async function deleteRegistration(id) {
  const store = await getStore();
  const ok = await store.deleteDoc(REGISTRATIONS, id);
  if (!ok) throw Object.assign(new Error('Not found'), { status: 404 });
  return { id, deleted: true };
}

/**
 * Contact form enquiries.
 *
 * Nothing a person types is stored. The enquiry is emailed to the address set
 * in the admin and then discarded — the console has no enquiry inbox by
 * design, so there is no database copy of anyone's name, address or message to
 * leak, export or have to erase on request. This matches how registrations
 * work; the two forms now hold to the same rule.
 *
 * What is recorded is a delivery record carrying no personal data: when, which
 * trial the enquiry named if any, and whether the email got through. Without it
 * a lapsed mail key would lose people silently.
 */
import { getStore } from '../db/store.js';
import { mailConfigured, sendMail } from './mail.service.js';

const DELIVERIES = 'enquiry_deliveries';

/**
 * Enquiries recorded before this became send-only. Nothing writes here any
 * more; it exists so the personal details captured under the old behaviour can
 * be found and deleted rather than sitting in the database unnoticed.
 */
const LEGACY = 'enquiries';

/**
 * Where enquiry notifications are sent.
 *
 * Deliberately NOT one of the site's content sections: those are all published
 * through /api/public/site, which would put this inbox in a JSON file anyone
 * can read and scrape. It lives in an admin-only document instead, reachable
 * only with a signed-in token — the same reasoning that keeps centre addresses
 * off the public site.
 */
const SETTINGS = 'admin_settings';
const SETTINGS_ID = 'enquiries';

export async function getEnquirySettings() {
  const store = await getStore();
  const doc = await store.getDoc(SETTINGS, SETTINGS_ID);
  return { notifyEmail: doc?.notifyEmail ?? '', mailConfigured: mailConfigured() };
}

export async function saveEnquirySettings({ notifyEmail }) {
  const store = await getStore();
  await store.setDoc(SETTINGS, SETTINGS_ID, { notifyEmail });
  return getEnquirySettings();
}

/** The message whoever handles enquiries receives. */
function compose({ name, country, email, phone, message, trialSlug }) {
  const lines = [
    'A new enquiry has come in through the website.',
    '',
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Phone:   ${phone || '—'}`,
    `Country: ${country}`,
    ...(trialSlug ? [`Trial:   ${trialSlug}`] : []),
    '',
    '--- Message ---',
    message,
    '',
    'Reply to this email to answer them directly — it is addressed to them.',
    '',
    'This message is the only copy. Nothing from this enquiry is stored on the',
    'website or in the admin console.',
  ];
  return { subject: `New website enquiry — ${name}`, text: lines.join('\n') };
}

/** Store the fact of an enquiry — never who made it. */
async function record({ trialSlug = '', delivery, messageId = '', error = '' }) {
  const store = await getStore();
  return store.addDoc(DELIVERIES, {
    trialSlug,
    delivery,
    messageId,
    error: error.slice(0, 300),
  });
}

/**
 * Email an enquiry, then record that it happened.
 *
 * Every failure path throws rather than swallowing, because the email is the
 * only copy: telling someone their message was received when it went nowhere
 * would be the one outcome worse than an error.
 */
export async function submitEnquiry(enquiry) {
  const { notifyEmail } = await getEnquirySettings();

  if (!notifyEmail || !mailConfigured()) {
    // Nowhere to send it and nowhere to keep it, so say so plainly instead of
    // accepting a message that would vanish.
    throw Object.assign(
      new Error('The enquiry form is temporarily unavailable. Please try again later.'),
      { status: 503, expose: true },
    );
  }

  const { subject, text } = compose(enquiry);

  try {
    const sent = await sendMail({
      to: notifyEmail,
      replyTo: enquiry.email,
      subject,
      text,
    });
    await record({ trialSlug: enquiry.trialSlug, delivery: 'sent', messageId: sent.id });
    return { delivered: true };
  } catch (err) {
    await record({ trialSlug: enquiry.trialSlug, delivery: 'failed', error: err.message });
    throw Object.assign(
      new Error('Your enquiry could not be sent. Please try again shortly.'),
      { status: 502, expose: true, cause: err },
    );
  }
}

export async function listEnquiryDeliveries() {
  const store = await getStore();
  const all = await store.listDocs(DELIVERIES);
  return all.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

export async function enquiryStats() {
  const all = await listEnquiryDeliveries();
  return {
    total: all.length,
    sent: all.filter((e) => e.delivery === 'sent').length,
    failed: all.filter((e) => e.delivery === 'failed').length,
    mailConfigured: mailConfigured(),
  };
}

/**
 * How many enquiries from the old behaviour are still held, and from when.
 *
 * Only a count and a date range — listing the records themselves would put the
 * personal details back on a screen, which is the thing being undone.
 */
export async function legacyEnquirySummary() {
  const store = await getStore();
  const all = await store.listDocs(LEGACY);
  if (all.length === 0) return { count: 0 };

  const dates = all.map((e) => String(e.createdAt ?? '')).filter(Boolean).sort();
  return { count: all.length, oldest: dates[0] ?? '', newest: dates.at(-1) ?? '' };
}

/** Erase every enquiry held from before this became send-only. */
export async function purgeLegacyEnquiries() {
  const store = await getStore();
  const all = await store.listDocs(LEGACY);
  for (const e of all) await store.deleteDoc(LEGACY, e.id);
  return { deleted: all.length };
}

import { getStore } from '../db/store.js';
import { mailConfigured, sendMail } from './mail.service.js';

const ENQUIRIES = 'enquiries';

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

/**
 * Email a copy of an enquiry to whoever is configured to receive them.
 *
 * Unlike a registration, the enquiry is already saved by the time this runs,
 * so a failed send loses nothing — it is recorded on the enquiry and logged,
 * and the person still gets their confirmation. Failing their submission over
 * a mail problem they cannot do anything about would be the worse outcome.
 */
export async function notifyEnquiry(enquiry) {
  const { notifyEmail } = await getEnquirySettings();
  if (!notifyEmail || !mailConfigured()) return 'off';

  const lines = [
    'A new enquiry has come in through the website.',
    '',
    `Name:    ${enquiry.name}`,
    `Email:   ${enquiry.email}`,
    `Phone:   ${enquiry.phone || '—'}`,
    `Country: ${enquiry.country}`,
    ...(enquiry.trialSlug ? [`Trial:   ${enquiry.trialSlug}`] : []),
    '',
    '--- Message ---',
    enquiry.message,
    '',
    'Reply to this email to answer them directly — it is addressed to them.',
  ];

  try {
    await sendMail({
      to: notifyEmail,
      replyTo: enquiry.email,
      subject: `New website enquiry — ${enquiry.name}`,
      text: lines.join('\n'),
    });
    return 'sent';
  } catch (err) {
    // Logged rather than thrown: the enquiry is safely stored either way, and
    // the admin shows the failed state so it is not silently missed.
    console.error('Enquiry notification failed:', err.message);
    return 'failed';
  }
}

export const ENQUIRY_STATUSES = ['new', 'in_progress', 'closed'];

export async function createEnquiry(data) {
  const store = await getStore();
  const enquiry = await store.addDoc(ENQUIRIES, { ...data, status: 'new' });

  const delivery = await notifyEnquiry(enquiry);
  return store.mergeDoc(ENQUIRIES, enquiry.id, { delivery });
}

export async function listEnquiries({ status } = {}) {
  const store = await getStore();
  const all = await store.listDocs(ENQUIRIES);
  const filtered = status ? all.filter((e) => e.status === status) : all;
  return filtered.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

export async function updateEnquiry(id, { status, notes }) {
  const store = await getStore();
  const current = await store.getDoc(ENQUIRIES, id);
  if (!current) throw Object.assign(new Error('Not found'), { status: 404 });
  const patch = {};
  if (status !== undefined) patch.status = status;
  if (notes !== undefined) patch.notes = notes;
  return store.mergeDoc(ENQUIRIES, id, patch);
}

export async function deleteEnquiry(id) {
  const store = await getStore();
  const ok = await store.deleteDoc(ENQUIRIES, id);
  if (!ok) throw Object.assign(new Error('Not found'), { status: 404 });
  return { id, deleted: true };
}

export async function enquiryStats() {
  const all = await listEnquiries();
  return {
    total: all.length,
    new: all.filter((e) => e.status === 'new').length,
    in_progress: all.filter((e) => e.status === 'in_progress').length,
    closed: all.filter((e) => e.status === 'closed').length,
  };
}

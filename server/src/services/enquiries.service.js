import { getStore } from '../db/store.js';

const ENQUIRIES = 'enquiries';

export const ENQUIRY_STATUSES = ['new', 'in_progress', 'closed'];

export async function createEnquiry(data) {
  const store = await getStore();
  return store.addDoc(ENQUIRIES, { ...data, status: 'new' });
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

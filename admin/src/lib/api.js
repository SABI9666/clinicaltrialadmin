/**
 * Admin API client. Holds the JWT in memory plus sessionStorage, so a page
 * refresh keeps the session but closing the tab ends it.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'cta.admin.token';

let token = null;
try {
  token = sessionStorage.getItem(TOKEN_KEY);
} catch {
  /* private mode or blocked storage — memory-only session */
}

export const getToken = () => token;

export function setToken(value) {
  token = value;
  try {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore — the in-memory token still works for this page */
  }
}

/** Raised on 401 so the app can drop the session and show the login screen. */
export class AuthError extends Error {}

async function request(path, { method = 'GET', body, isForm = false, authenticated = true } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  // A 401 on an authenticated call means the session lapsed. On the login call
  // it means the credentials were wrong, so let the endpoint's message through.
  if (res.status === 401 && authenticated) {
    setToken(null);
    throw new AuthError('Your session has expired. Please sign in again.');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (data?.details?.length) message = data.details.map((d) => `${d.path}: ${d.message}`).join('; ');
    } catch {
      /* keep the status message */
    }
    throw Object.assign(new Error(message), { status: res.status });
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      authenticated: false,
    }),
  me: () => request('/api/auth/me'),

  listSections: () => request('/api/admin/sections'),
  getSection: (key) => request(`/api/admin/sections/${key}`),
  saveSection: (key, value) => request(`/api/admin/sections/${key}`, { method: 'PUT', body: value }),
  resetSection: (key) => request(`/api/admin/sections/${key}/reset`, { method: 'POST' }),

  list: (collection) => request(`/api/admin/collections/${collection}`),
  create: (collection, value) =>
    request(`/api/admin/collections/${collection}`, { method: 'POST', body: value }),
  update: (collection, id, value) =>
    request(`/api/admin/collections/${collection}/${id}`, { method: 'PUT', body: value }),
  remove: (collection, id) =>
    request(`/api/admin/collections/${collection}/${id}`, { method: 'DELETE' }),
  reorder: (collection, ids) =>
    request(`/api/admin/collections/${collection}/reorder`, { method: 'POST', body: { ids } }),

  listMedia: () => request('/api/admin/media'),
  uploadMedia: (file, alt = '') => {
    const form = new FormData();
    form.append('file', file);
    form.append('alt', alt);
    return request('/api/admin/media', { method: 'POST', body: form, isForm: true });
  },
  updateMedia: (id, alt) => request(`/api/admin/media/${id}`, { method: 'PUT', body: { alt } }),
  removeMedia: (id) => request(`/api/admin/media/${id}`, { method: 'DELETE' }),

  listEnquiries: (status) =>
    request(`/api/admin/enquiries${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  enquiryStats: () => request('/api/admin/enquiries/stats'),
  getEnquirySettings: () => request('/api/admin/enquiries/settings'),
  saveEnquirySettings: (value) =>
    request('/api/admin/enquiries/settings', { method: 'PUT', body: value }),
  updateEnquiry: (id, patch) => request(`/api/admin/enquiries/${id}`, { method: 'PUT', body: patch }),
  removeEnquiry: (id) => request(`/api/admin/enquiries/${id}`, { method: 'DELETE' }),

  listRegistrations: () => request('/api/admin/registrations'),
  registrationStats: () => request('/api/admin/registrations/stats'),
  removeRegistration: (id) => request(`/api/admin/registrations/${id}`, { method: 'DELETE' }),

  listUsers: () => request('/api/auth/users'),
  createUser: (value) => request('/api/auth/users', { method: 'POST', body: value }),
  setUserPassword: (id, password) =>
    request(`/api/auth/users/${id}/password`, { method: 'PUT', body: { password } }),
  removeUser: (id) => request(`/api/auth/users/${id}`, { method: 'DELETE' }),
};

/** Turn an API-relative upload path into a URL the admin can preview. */
export function mediaUrl(src) {
  if (!src) return '';
  if (/^https?:\/\//i.test(src) || src.startsWith('data:')) return src;
  if (src.startsWith('/uploads/')) return `${BASE}${src}`;
  return src;
}

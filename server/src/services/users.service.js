import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getStore } from '../db/store.js';
import { config } from '../config.js';

const USERS = 'users';

const publicUser = ({ passwordHash, ...rest }) => rest;

export async function findByEmail(email) {
  const store = await getStore();
  const users = await store.listDocs(USERS);
  return users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase()) ?? null;
}

export async function listUsers() {
  const store = await getStore();
  return (await store.listDocs(USERS)).map(publicUser);
}

export async function createUser({ email, password, name = '', role = 'editor' }) {
  if (await findByEmail(email)) {
    throw Object.assign(new Error('A user with that email already exists'), { status: 409 });
  }
  const store = await getStore();
  const user = await store.addDoc(USERS, {
    email: String(email).toLowerCase(),
    name,
    role,
    passwordHash: await bcrypt.hash(password, 12),
  });
  return publicUser(user);
}

export async function setPassword(id, password) {
  const store = await getStore();
  const user = await store.getDoc(USERS, id);
  if (!user) throw Object.assign(new Error('Not found'), { status: 404 });
  return publicUser(await store.mergeDoc(USERS, id, { passwordHash: await bcrypt.hash(password, 12) }));
}

export async function deleteUser(id) {
  const store = await getStore();
  const users = await store.listDocs(USERS);
  const target = users.find((u) => u.id === id);
  if (!target) throw Object.assign(new Error('Not found'), { status: 404 });
  if (target.role === 'admin' && users.filter((u) => u.role === 'admin').length === 1) {
    throw Object.assign(new Error('Cannot delete the last admin user'), { status: 400 });
  }
  await store.deleteDoc(USERS, id);
  return { id, deleted: true };
}

export async function verifyCredentials(email, password) {
  const user = await findByEmail(email);
  // Always run a hash comparison so a missing user and a wrong password take
  // the same time and cannot be told apart by timing.
  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) return null;
  return publicUser(user);
}

export function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

/** True when at least one user account exists. */
export async function hasAnyUser() {
  const store = await getStore();
  return (await store.listDocs(USERS)).length > 0;
}

/** Create the first admin from env vars if no users exist yet. */
export async function ensureBootstrapAdmin() {
  const { email, password } = config.bootstrapAdmin;
  if (!email || !password) return null;
  const store = await getStore();
  if ((await store.listDocs(USERS)).length > 0) return null;
  return createUser({ email, password, name: 'Administrator', role: 'admin' });
}

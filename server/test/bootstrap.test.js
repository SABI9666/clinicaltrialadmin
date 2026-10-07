/**
 * The first admin account is the only way into the console: creating a user
 * requires an existing admin token. These cover the case where it silently
 * fails to be created, which locks the deployment out permanently.
 */
import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { rm, readFile } from 'node:fs/promises';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-tests';
process.env.DATA_FILE = '.data/bootstrap-test.json';
process.env.USE_FIRESTORE = 'false';
process.env.USE_POSTGRES = 'false';
process.env.USE_GCS = 'false';

const { config } = await import('../src/config.js');
const { getStore } = await import('../src/db/store.js');
const { ensureBootstrapAdmin, hasAnyUser, listUsers } = await import(
  '../src/services/users.service.js'
);

const store = await getStore();

/**
 * config is read from the environment once at import, and the store is a
 * module singleton, so drive both directly rather than reloading modules.
 */
async function reset({ email, password }) {
  for (const user of await store.listDocs('users')) await store.deleteDoc('users', user.id);
  config.bootstrapAdmin.email = email;
  config.bootstrapAdmin.password = password;
}

beforeEach(() => reset({ email: '', password: '' }));

after(async () => {
  await rm('.data/bootstrap-test.json', { force: true });
});

describe('bootstrap admin', () => {
  test('creates the first admin when both variables are set', async () => {
    await reset({ email: 'first@example.com', password: 'a-long-enough-password' });

    const admin = await ensureBootstrapAdmin();
    assert.ok(admin, 'an admin should have been created');
    assert.equal(admin.email, 'first@example.com');
    assert.equal(admin.role, 'admin');
    assert.equal(await hasAnyUser(), true);
  });

  test('creates nothing when ADMIN_EMAIL is missing', async () => {
    // Exactly the state a deploy reaches when cloudbuild passes ADMIN_PASSWORD
    // but forgets ADMIN_EMAIL: no account created, and no way to sign in.
    await reset({ email: '', password: 'a-long-enough-password' });

    assert.equal(await ensureBootstrapAdmin(), null);
    assert.equal(await hasAnyUser(), false, 'hasAnyUser must report the lockout');
  });

  test('creates nothing when ADMIN_PASSWORD is missing', async () => {
    await reset({ email: 'first@example.com', password: '' });

    assert.equal(await ensureBootstrapAdmin(), null);
    assert.equal(await hasAnyUser(), false);
  });

  test('does not add a second admin on a later boot', async () => {
    await reset({ email: 'first@example.com', password: 'a-long-enough-password' });
    await ensureBootstrapAdmin();

    config.bootstrapAdmin.email = 'second@example.com';
    assert.equal(await ensureBootstrapAdmin(), null, 'second boot must not add a user');

    const users = await listUsers();
    assert.equal(users.length, 1);
    assert.equal(users[0].email, 'first@example.com');
  });

  test('never exposes the password hash', async () => {
    await reset({ email: 'first@example.com', password: 'a-long-enough-password' });
    const admin = await ensureBootstrapAdmin();

    assert.equal(admin.passwordHash, undefined);
    for (const user of await listUsers()) assert.equal(user.passwordHash, undefined);
  });
});

describe('deployment config', () => {
  test('cloudbuild passes every variable the bootstrap admin needs', async () => {
    const yaml = await readFile('cloudbuild.yaml', 'utf8');
    // ADMIN_PASSWORD arrives as a secret, ADMIN_EMAIL as a plain env var.
    assert.match(yaml, /ADMIN_PASSWORD=/, 'ADMIN_PASSWORD must be wired up');
    assert.match(yaml, /ADMIN_EMAIL=\$\{_ADMIN_EMAIL\}/, 'ADMIN_EMAIL must be wired up');
    assert.match(yaml, /_ADMIN_EMAIL:/, '_ADMIN_EMAIL substitution must be declared');
  });

  test('cloudbuild passes the mail settings registrations need', async () => {
    const yaml = await readFile('cloudbuild.yaml', 'utf8');
    // Without these the API comes up healthy and records every registration as
    // undelivered — the form looks like it works and nobody is contacted.
    assert.match(yaml, /RESEND_API_KEY=clinical-trial-resend-key/, 'the key must be a secret');
    assert.match(yaml, /MAIL_FROM=\$\{_MAIL_FROM\}/, 'MAIL_FROM must be wired up');
    assert.match(yaml, /_MAIL_FROM:/, '_MAIL_FROM substitution must be declared');
  });

  test('sets every environment variable in a single flag', async () => {
    const yaml = await readFile('cloudbuild.yaml', 'utf8');
    // gcloud replaces the value of a repeated --set-env-vars rather than
    // merging, so a second flag would quietly drop everything in the first.
    assert.equal(
      (yaml.match(/--set-env-vars=/g) ?? []).length,
      1,
      'a second --set-env-vars would discard the first',
    );
  });

  test('cloudbuild wires the database and auth secrets', async () => {
    const yaml = await readFile('cloudbuild.yaml', 'utf8');
    for (const name of ['JWT_SECRET=', 'DATABASE_URL=', 'CORS_ORIGINS=']) {
      assert.ok(yaml.includes(name), `${name} must be wired up`);
    }
  });

  test('tags images with a substitution that manual builds populate', async () => {
    const yaml = await readFile('cloudbuild.yaml', 'utf8');
    // $COMMIT_SHA and $SHORT_SHA are only set for trigger-invoked builds. A
    // manual `gcloud builds submit` leaves them empty, yielding an image
    // reference that ends in ':' and failing the push.
    const tagRefs = [...yaml.matchAll(/\$\{?_SERVICE\}?:\$\{?(\w+)\}?/g)].map((m) => m[1]);
    assert.ok(tagRefs.length >= 3, 'expected the image reference in build, push and deploy');
    for (const ref of tagRefs) {
      assert.ok(
        !['COMMIT_SHA', 'SHORT_SHA', 'REVISION_ID', 'TAG_NAME', 'BRANCH_NAME'].includes(ref),
        `image tag uses $${ref}, which is empty for manual builds`,
      );
    }
  });
});

/**
 * Seeding only fills gaps, so a database created while the policies were still
 * placeholders would keep them. Start-up swaps those for the approved wording,
 * and must never overwrite a policy someone has edited in the admin.
 */
import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-tests';
process.env.DATA_FILE = '.data/policies-test.json';
process.env.USE_FIRESTORE = 'false';
process.env.USE_POSTGRES = 'false';
process.env.USE_GCS = 'false';

const { getStore } = await import('../src/db/store.js');
const { seedIfEmpty } = await import('../src/services/content.service.js');
const { PLACEHOLDER_POLICY_BODY } = await import('../src/seed/content.js');

const store = await getStore();

async function setPolicies(docs) {
  for (const doc of await store.listDocs('policies')) await store.deleteDoc('policies', doc.id);
  for (const doc of docs) await store.addDoc('policies', doc);
}

const bySlug = async () =>
  Object.fromEntries((await store.listDocs('policies')).map((p) => [p.slug, p]));

describe('placeholder policies', () => {
  beforeEach(() =>
    setPolicies([
      { slug: 'privacy-policy', title: 'Privacy Policy', body: PLACEHOLDER_POLICY_BODY, order: 1 },
      { slug: 'terms-of-use', title: 'Terms of Use', body: PLACEHOLDER_POLICY_BODY, order: 2 },
      { slug: 'cookie-policy', title: 'Cookie Policy', body: 'Edited in the admin.', order: 3 },
    ]),
  );

  after(() => rm('.data/policies-test.json', { force: true }));

  test('replaces placeholders and renames Terms of Use to Legal Notice', async () => {
    const created = await seedIfEmpty();
    assert.deepEqual(created.policiesUpdated.sort(), ['legal-notice', 'privacy-policy']);

    const p = await bySlug();
    assert.equal(p['terms-of-use'], undefined);
    assert.equal(p['legal-notice'].title, 'Legal Notice');
    assert.match(p['legal-notice'].body, /Southern Star Research Legal Notice/);
    assert.match(p['privacy-policy'].body, /Privacy Act 1988/);
    assert.equal(p['privacy-policy'].order, 1);
  });

  test('leaves a policy edited in the admin alone', async () => {
    await seedIfEmpty();
    assert.equal((await bySlug())['cookie-policy'].body, 'Edited in the admin.');
  });

  test('does nothing on a second start-up', async () => {
    await seedIfEmpty();
    assert.deepEqual((await seedIfEmpty()).policiesUpdated, []);
  });
});

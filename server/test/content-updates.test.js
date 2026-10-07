/**
 * Seeding only fills empty collections, so a live database needs the supplied
 * centre list and general contact applied once at start-up — without undoing
 * anything an admin has since edited, cleared or deleted.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-tests';
process.env.DATA_FILE = '.data/content-updates-test.json';
process.env.USE_FIRESTORE = 'false';
process.env.USE_POSTGRES = 'false';
process.env.USE_GCS = 'false';

const { getStore } = await import('../src/db/store.js');
const { seedIfEmpty, listPublicCentres } = await import('../src/services/content.service.js');
const { getEnquirySettings } = await import('../src/services/enquiries.service.js');
const { centres: SEED_CENTRES } = await import('../src/seed/content.js');

const store = await getStore();
const byName = async () =>
  Object.fromEntries((await store.listDocs('centres')).map((c) => [c.name, c]));

describe('content updates on an existing database', () => {
  before(async () => {
    // A site that went live with the original two centres and no addresses.
    await store.addDoc('centres', {
      name: 'Royal North Shore Hospital',
      region: 'New South Wales',
      email: '',
      order: 1,
    });
    await store.addDoc('centres', {
      name: 'Monash House Research Centre',
      region: 'Victoria',
      email: 'kept@example.org',
      order: 2,
    });
    await store.setDoc('content', 'contact', { title: 'Have a question?' });
  });

  after(() => rm('.data/content-updates-test.json', { force: true }));

  test('adds the missing centres and fills empty addresses only', async () => {
    const created = await seedIfEmpty();
    assert.deepEqual(created.updates, ['centres-2026-10', 'general-contact-2026-10']);

    const c = await byName();
    assert.equal(Object.keys(c).length, SEED_CENTRES.length);
    assert.equal(c['Royal North Shore Hospital'].email, 'Jean.Doyle@health.nsw.gov.au');
    assert.equal(c['Monash House Research Centre'].email, 'kept@example.org');
    assert.equal(c['The Alfred Bayside'].email, 'justin.bradley@alfred.org.au');
  });

  test('keeps centre addresses off the public list', async () => {
    for (const centre of await listPublicCentres()) assert.equal(centre.email, undefined);
  });

  test('routes enquiries to the general inbox and shows it beside the form', async () => {
    assert.equal((await getEnquirySettings()).notifyEmail, 'info@southernstarresearch.com');
    const contact = await store.getDoc('content', 'contact');
    assert.equal(contact.generalEmail, 'info@southernstarresearch.com');
    assert.equal(contact.title, 'Have a question?');
  });

  test('runs once: a centre deleted in the admin stays deleted', async () => {
    const alfred = (await byName())['The Alfred Bayside'];
    await store.deleteDoc('centres', alfred.id);
    const created = await seedIfEmpty();
    assert.deepEqual(created.updates, []);
    assert.equal((await byName())['The Alfred Bayside'], undefined);
  });
});

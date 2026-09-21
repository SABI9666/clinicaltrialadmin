/** One-off seeding script: `npm run seed`. Safe to re-run — it only fills gaps. */
import { seedIfEmpty } from '../services/content.service.js';
import { ensureBootstrapAdmin } from '../services/users.service.js';

const created = await seedIfEmpty();
console.log('Sections seeded:', created.sections.length ? created.sections.join(', ') : 'none');
for (const [name, count] of Object.entries(created.collections)) {
  console.log(`  ${name}: ${count} item(s)`);
}
const admin = await ensureBootstrapAdmin();
console.log(admin ? `Bootstrap admin created: ${admin.email}` : 'Bootstrap admin: skipped');
process.exit(0);

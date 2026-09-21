import { createApp } from './app.js';
import { config, assertProductionConfig } from './config.js';
import { seedIfEmpty } from './services/content.service.js';
import { ensureBootstrapAdmin, hasAnyUser } from './services/users.service.js';
import { storeBackend } from './db/store.js';

async function main() {
  assertProductionConfig();

  if (!config.jwt.secret) {
    throw new Error('JWT_SECRET is required. Set it in the environment before starting the API.');
  }

  if (config.seedOnBoot) {
    const created = await seedIfEmpty();
    if (created.sections.length) console.log(`Seeded sections: ${created.sections.join(', ')}`);
    for (const [name, count] of Object.entries(created.collections)) {
      console.log(`Seeded ${count} item(s) into "${name}"`);
    }
  }

  const admin = await ensureBootstrapAdmin();
  if (admin) console.log(`Created bootstrap admin user: ${admin.email}`);

  // A deployment with no users and no bootstrap credentials cannot be signed
  // into at all, and creating a user needs an existing admin token. Say so
  // loudly rather than coming up healthy but unusable.
  if (!(await hasAnyUser())) {
    console.warn(
      '\nWARNING: no admin user exists and none could be created.\n' +
        '  Nobody can sign in to the admin console in this state.\n' +
        `  ADMIN_EMAIL is ${config.bootstrapAdmin.email ? 'set' : 'NOT SET'}; ` +
        `ADMIN_PASSWORD is ${config.bootstrapAdmin.password ? 'set' : 'NOT SET'}.\n` +
        '  Set both, then redeploy — the account is created while the user table is empty.\n',
    );
  }

  createApp().listen(config.port, () => {
    console.log(
      `Clinical Trial Access API listening on :${config.port} ` +
        `(env=${config.env}, store=${storeBackend()})`,
    );
  });
}

main().catch((err) => {
  console.error('Failed to start API:', err.message);
  process.exit(1);
});

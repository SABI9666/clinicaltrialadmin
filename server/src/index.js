import { createApp } from './app.js';
import { config, assertProductionConfig } from './config.js';
import { seedIfEmpty } from './services/content.service.js';
import { ensureBootstrapAdmin } from './services/users.service.js';
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

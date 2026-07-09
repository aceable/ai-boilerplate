// Canonical production migration runner for Neon + drizzle on Railway.
//
// WHY THIS EXISTS (do not revert to `drizzle-kit migrate` on deploy):
// Neon's driver (@neondatabase/serverless) talks to Postgres over a WebSocket
// for anything transactional. Applying a migration is a transaction, so it
// needs a WebSocket constructor set (`neonConfig.webSocketConstructor = ws`).
// `drizzle-kit migrate` bundles its own Neon driver with no way to set that
// constructor: it can read the migration ledger over HTTP but STALLS the moment
// it tries to APPLY a pending migration. Deploys with nothing pending passed
// (ledger read only), which masked the bug until the first real migration hung
// the container and failed the healthcheck. `drizzle-kit` is also a devDep, so
// it isn't even present in the production image.
//
// This runner uses drizzle-orm's migrator over the same Neon Pool + `ws`
// connection the app itself uses (all prod deps), so migrations apply reliably.
// Plain .mjs so it runs with `node` in the container (no tsx needed).
//
// WHERE IT RUNS: railway.json wires this to `deploy.preDeployCommand`, NOT the
// startCommand. Pre-deploy runs once per deployment (not per-replica), in its
// own container, and a non-zero exit blocks the deploy instead of crash-looping
// the server. Never chain migrations into `startCommand` (`db:migrate && next
// start`) — that boot-couples migrations to the server and races across replicas.
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';

// Local dev reads the branch DB from the dotenv file (matches drizzle.config.ts).
// In production Railway injects DATABASE_URL directly and this file is absent —
// dotenv is a no-op then, which is fine.
config({ path: '.env.development.local' });
neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

try {
  console.log('Applying migrations from ./drizzle …');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✓ migrations applied');
} catch (err) {
  console.error('✗ migration failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}

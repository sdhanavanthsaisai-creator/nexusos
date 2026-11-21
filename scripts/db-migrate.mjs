import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Applies supabase/migrations to a Supabase Postgres database.
 *
 * Uses the Supabase CLI, which keeps a `supabase_migrations.schema_migrations`
 * ledger, so a migration is applied exactly once and a partially failed run is
 * obvious instead of silently half-applied.
 *
 * The connection string is read from SUPABASE_DB_URL (or DATABASE_URL if it is a
 * Postgres URL) in the environment or .env.local/.env. It is passed to the CLI
 * and never printed.
 *
 *   SUPABASE_DB_URL=postgres://... bun run db:migrate
 *   bun run db:migrate --dry-run
 */

const root = process.cwd();

function readEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return {};
  const entries = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    entries[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return entries;
}

const fromFiles = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
const candidates = [
  process.env.SUPABASE_DB_URL,
  process.env.DATABASE_URL,
  fromFiles.SUPABASE_DB_URL,
  fromFiles.DATABASE_URL,
];

const dbUrl = candidates.find(
  (value) => typeof value === 'string' && /^postgres(ql)?:\/\//i.test(value),
);

if (!dbUrl) {
  console.error(
    [
      'No Postgres connection string found.',
      '',
      'Set SUPABASE_DB_URL to the direct connection string from',
      'Supabase -> Project Settings -> Database -> Connection string.',
      '',
      '  SUPABASE_DB_URL=postgres://postgres:...@db.<ref>.supabase.co:5432/postgres bun run db:migrate',
      '',
      'Or paste supabase/schema.sql into the Supabase SQL editor, which is',
      'equivalent for a fresh project.',
    ].join('\n'),
  );
  process.exit(1);
}

const args = ['--yes', 'supabase@latest', 'db', 'push', '--db-url', dbUrl];
if (process.argv.includes('--dry-run')) args.push('--dry-run');

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  args,
  { stdio: 'inherit', cwd: root },
);

if (result.error) {
  console.error('Could not run the Supabase CLI:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

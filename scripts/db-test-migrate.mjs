import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  resolveDatabaseUrlTest,
  runDbTestMigrate,
} from './lib/run-db-test-migrate.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const resolved = resolveDatabaseUrlTest({ repoRoot });
if (!resolved.ok) {
  console.error(resolved.message);
  process.exit(1);
}

const status = runDbTestMigrate({
  repoRoot,
  databaseUrl: resolved.databaseUrl,
});

process.exit(status);

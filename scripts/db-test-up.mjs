import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runDbTestUp } from './lib/run-db-test-up.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const status = runDbTestUp({ repoRoot });
process.exit(status);

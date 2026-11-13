import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { envFromDotenv } from './lib/env-from-dotenv.mjs';
import { shouldRunApiIntegration } from './lib/should-run-api-integration.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dotenvPath = path.join(repoRoot, '.env');
const databaseUrlTest =
  process.env.DATABASE_URL_TEST || envFromDotenv('DATABASE_URL_TEST', '', dotenvPath);
const env = {
  ...process.env,
  DATABASE_URL_TEST: databaseUrlTest || process.env.DATABASE_URL_TEST,
};

if (!shouldRunApiIntegration(env)) {
  console.log(
    'OK: jest-integration ignorado (defina RUN_DB_TESTS=1 para harness; CI e npm run test:api:harness).',
  );
  process.exit(0);
}

const jestCli = path.join(repoRoot, 'node_modules', 'jest', 'bin', 'jest.js');
const config = path.join(repoRoot, 'apps', 'api', 'test', 'jest-integration.json');
const apiRoot = path.join(repoRoot, 'apps', 'api');

const result = spawnSync(
  process.execPath,
  ['--env-file', dotenvPath, jestCli, '--config', config],
  { cwd: apiRoot, env, stdio: 'inherit' },
);

process.exit(result.status === null ? 1 : result.status);

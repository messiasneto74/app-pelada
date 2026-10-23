import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { envFromDotenv } from './env-from-dotenv.mjs';

/**
 * @param {object} options
 * @param {string} options.repoRoot
 * @param {string} [options.envPath]
 * @param {string} [options.execPath]
 * @param {string} [options.prismaCli]
 */
export function resolveDatabaseUrlTest({ repoRoot, envPath }) {
  const dotenvPath = envPath ?? path.join(repoRoot, '.env');
  const url = envFromDotenv('DATABASE_URL_TEST', '', dotenvPath);
  if (!url) {
    return {
      ok: false,
      message:
        'DATABASE_URL_TEST não definido. Copie de .env.example e suba o container: npm run db:test:up',
    };
  }
  return { ok: true, databaseUrl: url };
}

/**
 * @param {object} options
 * @param {string} options.repoRoot
 * @param {string} options.databaseUrl
 * @param {string} [options.execPath]
 * @param {string} [options.prismaCli]
 * @param {Record<string, string>} [options.env]
 * @param {(cmd: string, args: string[], opts: object) => { status: number | null }} [options.spawnSyncFn]
 */
export function runDbTestMigrate({
  repoRoot,
  databaseUrl,
  execPath = process.execPath,
  prismaCli,
  env = process.env,
  spawnSyncFn = spawnSync,
}) {
  const cli =
    prismaCli ??
    path.join(repoRoot, 'node_modules', 'prisma', 'build', 'index.js');
  const schemaDir = path.join(repoRoot, 'apps', 'api');

  const result = spawnSyncFn(execPath, [cli, 'migrate', 'deploy'], {
    cwd: schemaDir,
    env: { ...env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  return result.status ?? 1;
}

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runE2eStackReady } from './lib/e2e-stack-ready.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

try {
  await runE2eStackReady();
} catch (err) {
  console.error(err);
  process.exit(1);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  npx,
  ['playwright', 'test', '--config', 'e2e/playwright.config.ts'],
  {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  },
);

process.exit(result.status ?? 1);

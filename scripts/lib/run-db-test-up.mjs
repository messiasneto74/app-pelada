import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { resolveDockerExecutable } from './docker-cli.mjs';

/**
 * @param {object} options
 * @param {string} options.repoRoot
 * @param {(cmd: string, args: string[], opts: object) => { status: number | null }} [options.spawnSyncFn]
 * @param {string} [options.dockerBin]
 */
export function runDbTestUp({
  repoRoot,
  spawnSyncFn = spawnSync,
  dockerBin = resolveDockerExecutable(),
}) {
  const result = spawnSyncFn(
    dockerBin,
    ['compose', 'up', '-d', 'postgres-app-test'],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );
  return result.status ?? 1;
}

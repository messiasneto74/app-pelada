import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  listKeycloakVolumesFromExec,
  resetKeycloakDev,
} from './lib/keycloak-reset-dev.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, { ignoreError = false } = {}) {
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
  } catch (err) {
    if (!ignoreError) throw err;
  }
}

resetKeycloakDev({
  run,
  listVolumes: () => listKeycloakVolumesFromExec(execSync, root),
});

/**
 * Reset dev do Keycloak: apaga o volume do Postgres do IdP e sobe de novo.
 * Uso: npm run keycloak:reset
 */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { filterKeycloakVolumeNames } from './lib/keycloak-volumes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, { ignoreError = false } = {}) {
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
  } catch (err) {
    if (!ignoreError) throw err;
  }
}

function listKeycloakVolumes() {
  try {
    const out = execSync('docker volume ls -q', { encoding: 'utf8', cwd: root });
    return filterKeycloakVolumeNames(out);
  } catch {
    return [];
  }
}

console.log('Parando Keycloak e Postgres do IdP…');
run('docker compose stop keycloak postgres-keycloak', { ignoreError: true });
run('docker compose rm -f keycloak postgres-keycloak', { ignoreError: true });
run('docker rm -f pelada-keycloak pelada-postgres-keycloak', { ignoreError: true });

const volumes = listKeycloakVolumes();
if (volumes.length === 0) {
  console.log(
    'Nenhum volume *pelada_pg_keycloak* encontrado (ok na 1ª vez ou já removido).',
  );
} else {
  for (const vol of volumes) {
    try {
      run(`docker volume rm ${vol}`);
    } catch {
      console.error(
        `Não foi possível remover ${vol}. Rode: docker rm -f pelada-keycloak pelada-postgres-keycloak`,
      );
      process.exit(1);
    }
  }
}

console.log('Subindo postgres-keycloak + keycloak (import do realm na 1ª subida)…');
run('docker compose up -d postgres-keycloak keycloak');

console.log('');
console.log('Aguarde 1–3 minutos, depois: npm.cmd run smoke:keycloak');
console.log('Credenciais: docs/credenciais-dev-local.md');

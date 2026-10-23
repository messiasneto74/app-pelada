/**
 * Smoke F0-4 — Keycloak realm pelada e OIDC metadata.
 * Uso: npm run smoke:keycloak (após npm run keycloak:up; 1ª subida ~30–90s).
 * Credenciais: docs/credenciais-dev-local.md
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envFromDotenv } from './lib/env-from-dotenv.mjs';
import {
  formatCredentialHints,
  waitForKeycloakMetadata,
} from './lib/keycloak-metadata.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

const issuer =
  process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/pelada';
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? 'pelada-web';
const maxAttempts = Number(process.env.KEYCLOAK_SMOKE_ATTEMPTS ?? 60);
const delayMs = Number(process.env.KEYCLOAK_SMOKE_DELAY_MS ?? 3000);

async function fetchJson(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  let metadata;
  try {
    metadata = await waitForKeycloakMetadata({
      fetchJson,
      issuer,
      maxAttempts,
      delayMs,
      sleepFn: async (ms) => {
        process.stderr.write(`Aguardando Keycloak…\n`);
        await sleep(ms);
      },
    });
  } catch (err) {
    console.error(
      `Keycloak não respondeu em ${maxAttempts} tentativas: ${err.message}`,
    );
    console.error('');
    console.error('Diagnóstico (PowerShell):');
    console.error('  docker ps -a --filter name=pelada-keycloak');
    console.error('  docker logs pelada-keycloak --tail 50');
    console.error('');
    console.error(
      'Reset: npm.cmd run keycloak:reset — ver docs/ambiente-dev-auth.md',
    );
    process.exit(1);
  }

  const healthUrl =
    process.env.KEYCLOAK_URL?.replace(/\/$/, '') ?? 'http://localhost:8080';
  try {
    const health = await fetch(`${healthUrl}/health/ready`);
    if (!health.ok) {
      console.warn(`Aviso: /health/ready → ${health.status} (realm OK mesmo assim)`);
    }
  } catch {
    console.warn('Aviso: health check indisponível (realm OIDC OK)');
  }

  console.log('OK Keycloak smoke');
  console.log(`  issuer: ${metadata.issuer}`);
  console.log(`  client esperado no realm: ${clientId}`);
  const adminUser = envFromDotenv('KEYCLOAK_ADMIN', 'admin', envPath);
  const adminPass = envFromDotenv(
    'KEYCLOAK_ADMIN_PASSWORD',
    'keycloak_admin_dev',
    envPath,
  );
  const hints = formatCredentialHints(adminUser, adminPass);
  console.log(`  ${hints.adminLine}`);
  console.log(`  ${hints.appLine}`);
  console.log('  Referência: docs/credenciais-dev-local.md');
}

main();

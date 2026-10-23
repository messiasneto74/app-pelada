/**
 * Smoke F0-7 — API /health após docker compose (Postgres + Keycloak + api).
 * Uso: npm run stack:up && npm run smoke:stack
 */

import { waitForApiHealth } from './lib/stack-health.mjs';

const apiBase = process.env.PELADA_API_URL ?? 'http://localhost:3000';
const maxAttempts = Number(process.env.STACK_SMOKE_ATTEMPTS ?? 30);
const delayMs = Number(process.env.STACK_SMOKE_DELAY_MS ?? 2000);

async function main() {
  try {
    const { url, body } = await waitForApiHealth({
      fetchFn: fetch,
      apiBase,
      maxAttempts,
      delayMs,
    });
    console.log(`OK ${url}`, body);
  } catch (err) {
    console.error(`API não ficou saudável: ${err.message}`);
    console.error('Verifique: docker ps, npm run stack:logs');
    process.exit(1);
  }
}

main();

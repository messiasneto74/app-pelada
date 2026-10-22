/**
 * Smoke F0-7 — API /health após docker compose (Postgres + Keycloak + api).
 * Uso: npm run stack:up && npm run smoke:stack
 */

const apiBase = (process.env.PELADA_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const maxAttempts = Number(process.env.STACK_SMOKE_ATTEMPTS ?? 30);
const delayMs = Number(process.env.STACK_SMOKE_DELAY_MS ?? 2000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const url = `${apiBase}/health`;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (body.database !== 'ok') {
        throw new Error(`database=${body.database ?? 'unknown'}`);
      }
      console.log(`OK ${url}`, body);
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(`API não ficou saudável: ${err.message}`);
        console.error('Verifique: docker ps, npm run stack:logs');
        process.exit(1);
      }
      await sleep(delayMs);
    }
  }
}

main();

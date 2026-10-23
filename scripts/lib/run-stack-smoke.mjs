import { waitForApiHealth } from './stack-health.mjs';

export async function runStackSmoke(deps = {}) {
  const {
    apiBase = process.env.PELADA_API_URL ?? 'http://localhost:3000',
    maxAttempts = Number(process.env.STACK_SMOKE_ATTEMPTS ?? 30),
    delayMs = Number(process.env.STACK_SMOKE_DELAY_MS ?? 2000),
    fetchFn = globalThis.fetch,
    log = console.log,
    error = console.error,
    onFatal = () => process.exit(1),
  } = deps;

  try {
    const { url, body } = await waitForApiHealth({
      fetchFn,
      apiBase,
      maxAttempts,
      delayMs,
    });
    log(`OK ${url}`, body);
    return true;
  } catch (err) {
    error(`API não ficou saudável: ${err.message}`);
    error('Verifique: docker ps, npm run stack:logs');
    onFatal();
    return false;
  }
}

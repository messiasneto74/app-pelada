export function normalizeApiBase(url) {
  return (url ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** Valida corpo JSON de GET /health (F0-7 smoke). */
export function assertHealthyApiBody(body) {
  if (!body || body.database !== 'ok') {
    throw new Error(`database=${body?.database ?? 'unknown'}`);
  }
  return body;
}

/**
 * Poll até API saudável ou esgotar tentativas.
 * @param {{ fetchFn: typeof fetch, apiBase: string, maxAttempts: number, delayMs: number, sleepFn?: (ms:number)=>Promise<void> }} opts
 */
export async function waitForApiHealth(opts) {
  const {
    fetchFn,
    apiBase,
    maxAttempts,
    delayMs,
    sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opts;
  const url = `${normalizeApiBase(apiBase)}/health`;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchFn(url);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      assertHealthyApiBody(body);
      return { url, body };
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) {
        throw lastError;
      }
      await sleepFn(delayMs);
    }
  }
  throw lastError ?? new Error('unreachable');
}

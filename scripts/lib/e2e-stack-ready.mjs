import { e2eUrls } from './e2e-env.mjs';

export async function fetchHealth(url, fetchFn = globalThis.fetch) {
  const res = await fetchFn(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  return res;
}

/** Aguarda API, Keycloak e (opcional) web antes do Playwright. */
export async function waitForE2eStack(deps = {}) {
  const { webUrl, apiUrl, keycloakIssuer } = e2eUrls(deps);
  const {
    fetchFn = globalThis.fetch,
    maxAttempts = Number(process.env.E2E_STACK_ATTEMPTS ?? 30),
    delayMs = Number(process.env.E2E_STACK_DELAY_MS ?? 2000),
    sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
    checkWeb = process.env.E2E_CHECK_WEB !== '0',
  } = deps;

  const targets = [
    { label: 'API', url: `${apiUrl.replace(/\/$/, '')}/health` },
    {
      label: 'Keycloak',
      url: `${keycloakIssuer.replace(/\/$/, '')}/.well-known/openid-configuration`,
    },
  ];
  if (checkWeb) {
    targets.push({ label: 'Web', url: webUrl });
  }

  for (const target of targets) {
    let lastErr;
    for (let i = 0; i < maxAttempts; i += 1) {
      try {
        await fetchHealth(target.url, fetchFn);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        await sleepFn(delayMs);
      }
    }
    if (lastErr) {
      throw new Error(`${target.label} indisponível (${target.url}): ${lastErr.message}`);
    }
  }
  return { webUrl, apiUrl, keycloakIssuer };
}

export async function runE2eStackReady(deps = {}) {
  const { log = console.log, onReady, ...rest } = deps;
  const urls = await waitForE2eStack(rest);
  log('OK stack E2E', urls);
  if (onReady) {
    await onReady(urls);
  }
  return urls;
}

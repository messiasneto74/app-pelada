import { waitForApiHealth } from './stack-health.mjs';
import { waitForKeycloakMetadata } from './keycloak-metadata.mjs';

/**
 * Smoke pós-deploy staging (DEPLOY-1): API /health + metadata OIDC do Keycloak.
 */
export async function runStagingSmoke(deps = {}) {
  const {
    apiBase = (process.env.STAGING_PELADA_API_URL ?? process.env.PELADA_API_URL ?? '')
      .replace(/\/$/, ''),
    keycloakUrl = (process.env.STAGING_KEYCLOAK_URL ?? process.env.KEYCLOAK_URL ?? '')
      .replace(/\/$/, ''),
    realm = process.env.KEYCLOAK_REALM ?? 'pelada',
    issuer = process.env.KEYCLOAK_ISSUER ?? `${keycloakUrl}/realms/${realm}`,
    maxAttempts = Number(process.env.STAGING_SMOKE_ATTEMPTS ?? 20),
    delayMs = Number(process.env.STAGING_SMOKE_DELAY_MS ?? 3000),
    fetchFn = globalThis.fetch,
    waitForApiHealthFn = waitForApiHealth,
    waitForKeycloakMetadataFn = waitForKeycloakMetadata,
    log = console.log,
    error = console.error,
    onFatal = () => process.exit(1),
  } = deps;

  if (!apiBase) {
    error('Defina STAGING_PELADA_API_URL ou PELADA_API_URL');
    onFatal();
    return false;
  }
  if (!issuer.includes('/realms/')) {
    error('Defina KEYCLOAK_ISSUER ou STAGING_KEYCLOAK_URL + KEYCLOAK_REALM');
    onFatal();
    return false;
  }

  try {
    const { url, body } = await waitForApiHealthFn({
      fetchFn,
      apiBase,
      maxAttempts,
      delayMs,
    });
    log(`API OK ${url}`, body);
  } catch (err) {
    error(`API staging indisponível: ${err.message}`);
    onFatal();
    return false;
  }

  try {
    const meta = await waitForKeycloakMetadataFn({
      fetchJson: async (url) => {
        const res = await fetchFn(url, { redirect: 'follow' });
        if (!res.ok) {
          throw new Error(`${url} → HTTP ${res.status}`);
        }
        return res.json();
      },
      issuer,
      maxAttempts,
      delayMs,
    });
    log(`Keycloak OK issuer=${meta.issuer ?? issuer}`);
  } catch (err) {
    error(`Keycloak staging indisponível: ${err.message}`);
    onFatal();
    return false;
  }

  log('smoke:staging concluído');
  return true;
}

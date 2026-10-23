import { envFromDotenv } from './env-from-dotenv.mjs';
import {
  formatCredentialHints,
  waitForKeycloakMetadata,
} from './keycloak-metadata.mjs';

export async function runKeycloakSmoke(deps = {}) {
  const {
    issuer = process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/pelada',
    clientId = process.env.KEYCLOAK_CLIENT_ID ?? 'pelada-web',
    maxAttempts = Number(process.env.KEYCLOAK_SMOKE_ATTEMPTS ?? 60),
    delayMs = Number(process.env.KEYCLOAK_SMOKE_DELAY_MS ?? 3000),
    envPath,
    fetchFn = globalThis.fetch,
    fetchJson = async (url) => {
      const res = await fetchFn(url, { redirect: 'follow' });
      if (!res.ok) {
        throw new Error(`${url} → HTTP ${res.status}`);
      }
      return res.json();
    },
    log = console.log,
    warn = console.warn,
    error = console.error,
    onFatal = () => process.exit(1),
    sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = deps;

  let metadata;
  try {
    metadata = await waitForKeycloakMetadata({
      fetchJson,
      issuer,
      maxAttempts,
      delayMs,
      sleepFn: async (ms) => {
        await sleepFn(ms);
      },
    });
  } catch (err) {
    error(`Keycloak não respondeu em ${maxAttempts} tentativas: ${err.message}`);
    error('Reset: npm.cmd run keycloak:reset — ver docs/ambiente-dev-auth.md');
    onFatal();
    return false;
  }

  const healthUrl =
    process.env.KEYCLOAK_URL?.replace(/\/$/, '') ?? 'http://localhost:8080';
  try {
    const health = await fetchFn(`${healthUrl}/health/ready`);
    if (!health.ok) {
      warn(`Aviso: /health/ready → ${health.status} (realm OK mesmo assim)`);
    }
  } catch {
    warn('Aviso: health check indisponível (realm OIDC OK)');
  }

  log('OK Keycloak smoke');
  log(`  issuer: ${metadata.issuer}`);
  log(`  client esperado no realm: ${clientId}`);
  const adminUser = envFromDotenv('KEYCLOAK_ADMIN', 'admin', envPath);
  const adminPass = envFromDotenv(
    'KEYCLOAK_ADMIN_PASSWORD',
    'keycloak_admin_dev',
    envPath,
  );
  const hints = formatCredentialHints(adminUser, adminPass);
  log(`  ${hints.adminLine}`);
  log(`  ${hints.appLine}`);
  log('  Referência: docs/credenciais-dev-local.md');
  return true;
}

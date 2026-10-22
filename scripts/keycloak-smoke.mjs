/**
 * Smoke F0-4 — Keycloak realm pelada e OIDC metadata (sem credenciais).
 * Uso: npm run smoke:keycloak (após npm run keycloak:up; 1ª subida ~30–90s).
 */

const issuer =
  process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/pelada';
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? 'pelada-web';
const maxAttempts = Number(process.env.KEYCLOAK_SMOKE_ATTEMPTS ?? 60);
const delayMs = Number(process.env.KEYCLOAK_SMOKE_DELAY_MS ?? 3000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  return res.json();
}

async function main() {
  const wellKnown = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  let metadata;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      metadata = await fetchJson(wellKnown);
      break;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(
          `Keycloak não respondeu em ${maxAttempts} tentativas: ${err.message}`,
        );
        console.error('');
        console.error('Diagnóstico (PowerShell):');
        console.error('  docker ps -a --filter name=pelada-keycloak');
        console.error('  docker logs pelada-keycloak --tail 50');
        console.error('');
        console.error(
          'Causas comuns: 1ª subida lenta (>3 min); container reiniciando (senha POSTGRES_KEYCLOAK_PASSWORD ≠ volume); porta 8080 ocupada.',
        );
        console.error(
          'Você NÃO precisa configurar Google/conta pessoal só para subir o Keycloak — isso é opcional (ver ambiente-dev-auth.md).',
        );
        process.exit(1);
      }
      process.stderr.write(
        `Aguardando Keycloak (${attempt}/${maxAttempts})…\n`,
      );
      await sleep(delayMs);
    }
  }

  if (metadata.issuer !== issuer && metadata.issuer !== issuer + '/') {
    console.error(
      `issuer esperado ${issuer}, recebido ${metadata.issuer}`,
    );
    process.exit(1);
  }

  if (!metadata.jwks_uri?.includes('/protocol/openid-connect/certs')) {
    console.error('jwks_uri ausente ou inválido');
    process.exit(1);
  }

  const healthUrl =
    process.env.KEYCLOAK_URL?.replace(/\/$/, '') ??
    'http://localhost:8080';
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
  console.log('  Próximo: admin console, login dev@pelada.local (ver ambiente-dev-auth.md)');
}

main();

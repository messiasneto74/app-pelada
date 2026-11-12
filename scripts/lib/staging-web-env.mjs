/**
 * Gera `environment.staging.generated.ts` a partir de variáveis de deploy (DEPLOY-1).
 */

export function resolveStagingWebEnvFromProcess(env = process.env) {
  const apiUrl = (env.STAGING_PELADA_API_URL ?? env.PELADA_API_URL ?? '').replace(/\/$/, '');
  const keycloakUrl = (env.STAGING_KEYCLOAK_URL ?? env.KEYCLOAK_URL ?? '').replace(/\/$/, '');
  const realm = env.KEYCLOAK_REALM ?? 'pelada';
  const clientId = env.KEYCLOAK_CLIENT_ID ?? 'pelada-web';
  const missing = [];
  if (!apiUrl) {
    missing.push('STAGING_PELADA_API_URL ou PELADA_API_URL');
  }
  if (!keycloakUrl) {
    missing.push('STAGING_KEYCLOAK_URL ou KEYCLOAK_URL');
  }
  if (missing.length > 0) {
    throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
  }
  return { apiUrl, keycloakUrl, realm, clientId, production: true };
}

export function buildStagingWebEnvironmentSource(opts) {
  const apiUrl = opts.apiUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const keycloakUrl = opts.keycloakUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const realm = opts.realm.replace(/'/g, "\\'");
  const clientId = opts.clientId.replace(/'/g, "\\'");
  return `/** Gerado por scripts/prepare-staging-web-env.mjs — não editar. */
export const environment = {
  production: ${Boolean(opts.production)},
  apiUrl: '${apiUrl}',
  keycloak: {
    url: '${keycloakUrl}',
    realm: '${realm}',
    clientId: '${clientId}',
  },
};
`;
}

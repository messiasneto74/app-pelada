/** URLs padrão para E2E local (issue E2E-1). */
export function e2eUrls(overrides = {}) {
  return {
    webUrl: overrides.webUrl ?? process.env.PELADA_WEB_URL ?? 'http://localhost:4200',
    apiUrl: overrides.apiUrl ?? process.env.PELADA_API_URL ?? 'http://localhost:3000',
    keycloakIssuer:
      overrides.keycloakIssuer ??
      process.env.KEYCLOAK_ISSUER ??
      'http://localhost:8080/realms/pelada',
  };
}

export function e2eKeycloakCredentials(overrides = {}) {
  return {
    username: overrides.username ?? process.env.E2E_KC_USER ?? 'dev',
    password: overrides.password ?? process.env.E2E_KC_PASSWORD ?? 'dev-pelada-local',
  };
}

export function wellKnownUrl(issuer) {
  return `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
}

/** Valida metadata OIDC do realm (smoke Keycloak). */
export function validateKeycloakMetadata(metadata, expectedIssuer) {
  if (!metadata?.jwks_uri?.includes('/protocol/openid-connect/certs')) {
    throw new Error('jwks_uri ausente ou inválido');
  }
  const issuer = expectedIssuer.replace(/\/$/, '');
  const got = metadata.issuer?.replace(/\/$/, '');
  if (got !== issuer) {
    throw new Error(`issuer esperado ${issuer}, recebido ${metadata.issuer}`);
  }
  return metadata;
}

export function formatCredentialHints(adminUser, adminPass) {
  return {
    adminLine: `Admin console (realm master): ${adminUser} / ${adminPass}`,
    appLine: 'Login app (realm pelada): dev ou dev@pelada.local / dev-pelada-local',
  };
}

/**
 * Poll até metadata OIDC responder.
 */
export async function waitForKeycloakMetadata(opts) {
  const {
    fetchJson,
    issuer,
    maxAttempts,
    delayMs,
    sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opts;
  const wellKnown = wellKnownUrl(issuer);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const metadata = await fetchJson(wellKnown);
      return validateKeycloakMetadata(metadata, issuer);
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

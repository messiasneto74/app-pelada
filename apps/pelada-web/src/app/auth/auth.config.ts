import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';

export function buildAuthConfig(): AuthConfig {
  const base = environment.keycloak.url.replace(/\/$/, '');
  return {
    issuer: `${base}/realms/${environment.keycloak.realm}`,
    redirectUri: `${window.location.origin}/entrar`,
    clientId: environment.keycloak.clientId,
    responseType: 'code',
    scope: 'openid profile email',
    showDebugInformation: !environment.production,
    requireHttps: environment.production,
    strictDiscoveryDocumentValidation: false,
  };
}

import { Capacitor } from '@capacitor/core';
import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';
import { nativeBridge } from './native-bridge';

/** Scheme nativo registrado no Android (`AndroidManifest.xml`) e no iOS (`Info.plist`). */
export const NATIVE_REDIRECT_URI = 'com.pelada.app://callback';

export function buildAuthConfig(): AuthConfig {
  const base = environment.keycloak.url.replace(/\/$/, '');
  const native = Capacitor.isNativePlatform();
  return {
    issuer: `${base}/realms/${environment.keycloak.realm}`,
    redirectUri: native ? NATIVE_REDIRECT_URI : `${window.location.origin}/entrar`,
    clientId: environment.keycloak.clientId,
    responseType: 'code',
    scope: 'openid profile email',
    showDebugInformation: !environment.production,
    requireHttps: environment.production,
    strictDiscoveryDocumentValidation: false,
    // No app empacotado, a Google recusa login OAuth dentro da WebView
    // embutida (erro `disallowed_useragent`) — por isso o fluxo precisa
    // abrir o navegador do sistema via @capacitor/browser.
    openUri: native
      ? (uri: string) => {
          void nativeBridge.openInSystemBrowser(uri);
        }
      : (uri: string) => {
          window.location.href = uri;
        },
  };
}

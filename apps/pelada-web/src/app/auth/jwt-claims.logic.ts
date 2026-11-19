/**
 * Decodifica o payload de um JWT (sem validar assinatura ou nonce) — usado só
 * pra ler claims básicas (ex. `sub`) quando o fluxo não passa por id_token
 * confiável para isso (issue #193: Resource Owner Password não usa nonce, e
 * angular-oauth2-oidc rejeita o id_token desse grant por "Wrong nonce").
 */
export function decodeJwtClaims(
  token: string | null | undefined,
): Record<string, unknown> | null {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

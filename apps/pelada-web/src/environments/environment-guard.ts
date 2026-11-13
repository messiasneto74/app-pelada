/**
 * `environment.ts` (usado por padrão no build de produção, sem fileReplacement)
 * traz URLs placeholder (`api.example.com`/`auth.example.com`). Sem essa guarda,
 * um build de produção "esquecido" (sem gerar environment.staging.generated.ts
 * ou equivalente) sobe silenciosamente apontando para um domínio inexistente
 * (bug Médio da auditoria).
 */
export type AppEnvironment = {
  production: boolean;
  apiUrl: string;
  keycloak: { url: string };
};

const PLACEHOLDER_HOSTS = ['api.example.com', 'auth.example.com'];

export function assertProductionEnvironmentConfigured(
  env: AppEnvironment,
): void {
  if (!env.production) {
    return;
  }
  const placeholder = PLACEHOLDER_HOSTS.find(
    (host) => env.apiUrl.includes(host) || env.keycloak.url.includes(host),
  );
  if (placeholder) {
    throw new Error(
      `Build de produção configurado com URL placeholder (${placeholder}). ` +
        'Gere environment.staging.generated.ts (ou equivalente) antes do build.',
    );
  }
}

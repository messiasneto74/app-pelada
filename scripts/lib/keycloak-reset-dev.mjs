import { filterKeycloakVolumeNames } from './keycloak-volumes.mjs';

export function listKeycloakVolumesFromExec(execSync, cwd) {
  try {
    const out = execSync('docker volume ls -q', { encoding: 'utf8', cwd });
    return filterKeycloakVolumeNames(out);
  } catch {
    return [];
  }
}

/** Reset IdP local (testável com exec mockado). */
export function resetKeycloakDev(deps) {
  const {
    run,
    listVolumes,
    log = console.log,
    error = console.error,
    onFatal = () => process.exit(1),
  } = deps;

  log('Parando Keycloak e Postgres do IdP…');
  run('docker compose stop keycloak postgres-keycloak', { ignoreError: true });
  run('docker compose rm -f keycloak postgres-keycloak', { ignoreError: true });
  run('docker rm -f pelada-keycloak pelada-postgres-keycloak', { ignoreError: true });

  const volumes = listVolumes();
  if (volumes.length === 0) {
    log('Nenhum volume *pelada_pg_keycloak* encontrado (ok na 1ª vez ou já removido).');
  } else {
    for (const vol of volumes) {
      try {
        run(`docker volume rm ${vol}`);
      } catch {
        error(
          `Não foi possível remover ${vol}. Rode: docker rm -f pelada-keycloak pelada-postgres-keycloak`,
        );
        onFatal();
        return false;
      }
    }
  }

  log('Subindo postgres-keycloak + keycloak (import do realm na 1ª subida)…');
  run('docker compose up -d postgres-keycloak keycloak');
  log('Aguarde 1–3 minutos, depois: npm.cmd run smoke:keycloak');
  log('Credenciais: docs/credenciais-dev-local.md');
  return true;
}

/** Filtra nomes de volume Docker que contêm pelada_pg_keycloak. */
export function filterKeycloakVolumeNames(dockerVolumeLsOutput) {
  return dockerVolumeLsOutput
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter((v) => v && v.includes('pelada_pg_keycloak'));
}

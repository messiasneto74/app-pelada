import { describe, expect, it } from 'vitest';
import { filterKeycloakVolumeNames } from './keycloak-volumes.mjs';

describe('filterKeycloakVolumeNames', () => {
  it('filters matching volumes', () => {
    const out = `pelada_pg_app
app-futebol_pelada_pg_keycloak
pelada_pg_keycloak
`;
    expect(filterKeycloakVolumeNames(out)).toEqual([
      'app-futebol_pelada_pg_keycloak',
      'pelada_pg_keycloak',
    ]);
  });

  it('empty output', () => {
    expect(filterKeycloakVolumeNames('')).toEqual([]);
  });
});

import {
  buildKeycloakAdminUrls,
  splitDisplayName,
} from './keycloak-admin.client';

describe('buildKeycloakAdminUrls', () => {
  it('remove barra final e monta token/users', () => {
    expect(buildKeycloakAdminUrls('http://localhost:8080/', 'pelada')).toEqual({
      tokenUrl:
        'http://localhost:8080/realms/master/protocol/openid-connect/token',
      usersUrl: 'http://localhost:8080/admin/realms/pelada/users',
    });
  });

  it('encode realm com caracteres especiais', () => {
    expect(buildKeycloakAdminUrls('http://kc', 'a b').usersUrl).toBe(
      'http://kc/admin/realms/a%20b/users',
    );
  });
});

describe('splitDisplayName', () => {
  it('vazio', () => {
    expect(splitDisplayName(undefined)).toEqual({
      firstName: '',
      lastName: '',
    });
    expect(splitDisplayName('  ')).toEqual({ firstName: '', lastName: '' });
  });

  it('só primeiro nome', () => {
    expect(splitDisplayName('Ana')).toEqual({
      firstName: 'Ana',
      lastName: '',
    });
  });

  it('nome completo', () => {
    expect(splitDisplayName('Ana Silva Costa')).toEqual({
      firstName: 'Ana',
      lastName: 'Silva Costa',
    });
  });
});

import {
  mapPasswordLoginError,
  mapRegisterError,
} from './auth.service';

describe('mapPasswordLoginError', () => {
  it('credenciais inválidas', () => {
    expect(
      mapPasswordLoginError({ status: 401, error: { error: 'invalid_grant' } }),
    ).toContain('incorretos');
  });

  it('client sem Direct Access Grants', () => {
    expect(
      mapPasswordLoginError({
        status: 400,
        error: { error: 'unauthorized_client' },
      }),
    ).toContain('Direct Access Grants');
  });

  it('rede / IdP fora', () => {
    expect(mapPasswordLoginError({ status: 0 })).toContain('Keycloak');
  });
});

describe('mapRegisterError', () => {
  it('conflito de e-mail', () => {
    expect(mapRegisterError({ status: 409 })).toContain('Já existe');
  });

  it('validação', () => {
    expect(
      mapRegisterError({
        status: 400,
        error: { message: 'email must be an email' },
      }),
    ).toContain('email must be an email');
  });
});

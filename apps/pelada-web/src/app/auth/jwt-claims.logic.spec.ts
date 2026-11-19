import { decodeJwtClaims } from './jwt-claims.logic';

function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (s: string) =>
    btoa(unescape(encodeURIComponent(s)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe('decodeJwtClaims (issue #193)', () => {
  it('decodifica as claims do payload', () => {
    const token = fakeJwt({ sub: 'user-1', email: 'a@b.com' });
    expect(decodeJwtClaims(token)).toEqual({ sub: 'user-1', email: 'a@b.com' });
  });

  it('decodifica caracteres acentuados (UTF-8)', () => {
    const token = fakeJwt({ name: 'João' });
    expect(decodeJwtClaims(token)?.['name']).toBe('João');
  });

  it('retorna null para token ausente', () => {
    expect(decodeJwtClaims(null)).toBeNull();
    expect(decodeJwtClaims(undefined)).toBeNull();
    expect(decodeJwtClaims('')).toBeNull();
  });

  it('retorna null para token malformado', () => {
    expect(decodeJwtClaims('não-é-um-jwt')).toBeNull();
    expect(decodeJwtClaims('a.b-mas-não-base64-!!!.c')).toBeNull();
  });
});

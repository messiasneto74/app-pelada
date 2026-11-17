import { displayNameFromClaims } from './jwt.strategy';

describe('displayNameFromClaims', () => {
  it('usa o claim name (nome completo do cadastro ou do Google)', () => {
    expect(
      displayNameFromClaims({
        name: 'Rafael Souza',
        given_name: 'Rafael',
        family_name: 'Souza',
      }),
    ).toBe('Rafael Souza');
  });

  it('ignora o sobrenome placeholder "Pelada" do POST /register', () => {
    expect(
      displayNameFromClaims({
        name: 'Rafael Pelada',
        given_name: 'Rafael',
        family_name: 'Pelada',
      }),
    ).toBe('Rafael');
  });

  it('sem claims de nome devolve undefined', () => {
    expect(displayNameFromClaims({})).toBeUndefined();
    expect(displayNameFromClaims({ name: '   ' })).toBeUndefined();
  });
});

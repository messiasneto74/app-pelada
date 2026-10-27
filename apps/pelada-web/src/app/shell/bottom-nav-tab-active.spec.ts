import { bottomNavTabActive } from './bottom-nav-tab-active';

describe('bottomNavTabActive', () => {
  it('Partida ativa em subrotas', () => {
    expect(bottomNavTabActive('/partida/sorteio', 'partida')).toBe(true);
    expect(bottomNavTabActive('/partida/sorteio', 'inicio')).toBe(false);
  });

  it('Início ativa em /inicio/regras', () => {
    expect(bottomNavTabActive('/inicio/regras', 'inicio')).toBe(true);
  });

  it('Jogadores e Caixa', () => {
    expect(bottomNavTabActive('/jogadores', 'jogadores')).toBe(true);
    expect(bottomNavTabActive('/caixa', 'caixa')).toBe(true);
  });
});

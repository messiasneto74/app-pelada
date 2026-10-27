export type BottomNavTabId = 'inicio' | 'partida' | 'jogadores' | 'caixa';

/** Destaca a aba correta para rotas filhas (ex.: /partida/sorteio → Partida). */
export function bottomNavTabActive(url: string, tab: BottomNavTabId): boolean {
  const path = url.split('?')[0].split('#')[0];
  switch (tab) {
    case 'inicio':
      return path === '/inicio' || path.startsWith('/inicio/');
    case 'partida':
      return path === '/partida' || path.startsWith('/partida/');
    case 'jogadores':
      return path === '/jogadores' || path.startsWith('/jogadores/');
    case 'caixa':
      return path === '/caixa' || path.startsWith('/caixa/');
    default:
      return false;
  }
}

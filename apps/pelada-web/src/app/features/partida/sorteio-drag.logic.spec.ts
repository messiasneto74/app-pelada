import { resolveSwapPairAfterCrossListDrop } from './sorteio-drag.logic';

describe('sorteio-drag.logic', () => {
  const p = (id: string) => ({ id });

  it('returns displaced player below inserted slot', () => {
    const after = ['a', 'x', 'y'].map(p);
    const pair = resolveSwapPairAfterCrossListDrop(after, 0, 'a');
    expect(pair).toEqual({ playerAId: 'a', playerBId: 'x' });
  });

  it('uses player above when dropped at end', () => {
    const after = ['x', 'y', 'a'].map(p);
    const pair = resolveSwapPairAfterCrossListDrop(after, 2, 'a');
    expect(pair).toEqual({ playerAId: 'a', playerBId: 'y' });
  });

  it('returns null when alone in list', () => {
    expect(resolveSwapPairAfterCrossListDrop([p('a')], 0, 'a')).toBeNull();
  });
});

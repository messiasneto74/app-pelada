import { resolveSelfPlayerId } from './presence-action.logic';

describe('presence-action.logic', () => {
  it('resolveSelfPlayerId encontra jogador pelo userId', () => {
    expect(
      resolveSelfPlayerId(
        [
          { id: 'pl1', userId: 'u-me' },
          { id: 'pl2', userId: null },
        ],
        'u-me',
      ),
    ).toBe('pl1');
  });
});

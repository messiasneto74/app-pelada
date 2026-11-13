import { resolveInicioEmptyStates } from './inicio-empty-states';

describe('inicio empty states (3.1-EMPTY)', () => {
  it('sem partida e sem jogadores', () => {
    expect(
      resolveInicioEmptyStates({ nextMatch: null, rosterPlayerCount: 0 }),
    ).toEqual({ showNoMatch: true, showNoRoster: true });
  });

  it('com partida e elenco', () => {
    expect(
      resolveInicioEmptyStates({
        nextMatch: {
          matchId: 'm1',
          dateLabel: 'x',
          timeLabel: '',
          locationLabel: '',
          modalityLabel: '',
          confirmedCount: 1,
          capacity: 10,
          vacancyPercent: 10,
          confirmedPlayers: [],
          presenceLink: '/partida/presenca',
        },
        rosterPlayerCount: 5,
      }),
    ).toEqual({ showNoMatch: false, showNoRoster: false });
  });
});

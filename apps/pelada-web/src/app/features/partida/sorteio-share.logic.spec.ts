import type { MatchDrawDetailDto } from '../../core/match/match-draw-api.model';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import {
  buildDrawShareLines,
  buildDrawShareText,
  measureDrawShareImageHeight,
  SHARE_IMAGE_WIDTH_PX,
} from './sorteio-share.logic';

const draw: MatchDrawDetailDto = {
  drawId: 'd1',
  matchId: 'm1',
  balanceScore: 80,
  seed: '1',
  metrics: {
    balanceScore: 80,
    teamAverages: [8, 6],
    maxAverageDiff: 2,
    summaryText: 'Diferença leve entre médias.',
  },
  teams: [
    {
      id: 't0',
      name: 'Time A',
      sortOrder: 0,
      playerIds: ['p1'],
      players: [{ playerId: 'p1', sortOrder: 0 }],
    },
    {
      id: 't1',
      name: 'Time B',
      sortOrder: 1,
      playerIds: ['p2'],
      players: [{ playerId: 'p2', sortOrder: 0 }],
    },
  ],
};

const roster = new Map<string, RosterPlayer>([
  [
    'p1',
    {
      id: 'p1',
      displayName: 'Ana',
      isGoalkeeper: false,
      position: 'Meio',
      rating: 8,
      tags: [],
      isFixedList: false,
    },
  ],
  [
    'p2',
    {
      id: 'p2',
      displayName: 'Bruno',
      isGoalkeeper: false,
      position: 'Ataque',
      rating: 6,
      tags: [],
      isFixedList: false,
    },
  ],
]);

describe('sorteio-share.logic §3.5-SHARE', () => {
  it('buildDrawShareText can hide ratings (história 61)', () => {
    const withNotes = buildDrawShareText(draw, roster, { hideRatings: false });
    expect(withNotes).toContain('nota 8');
    const noNotes = buildDrawShareText(draw, roster, { hideRatings: true });
    expect(noNotes).not.toContain('nota');
    expect(noNotes).toContain('Ana');
  });

  it('buildDrawShareLines orders teams by sortOrder', () => {
    const lines = buildDrawShareLines(draw, roster);
    const teams = lines.filter((l) => l.kind === 'team').map((l) => l.text);
    expect(teams).toEqual(['Time A', 'Time B']);
  });

  it('measureDrawShareImageHeight is stable for non-empty draw', () => {
    const lines = buildDrawShareLines(draw, roster);
    const h = measureDrawShareImageHeight(lines);
    expect(h).toBeGreaterThan(SHARE_IMAGE_WIDTH_PX / 3);
    expect(h).toBeLessThan(2000);
  });
});

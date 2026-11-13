import {
  filterRosterBySearch,
  filterRosterBySegment,
  filterRosterList,
  formatRosterRating,
  rosterPositionLabel,
} from './roster-list.logic';
import type { RosterPlayer } from './roster-player.model';

const sample: RosterPlayer[] = [
  {
    id: '1',
    displayName: 'Ana Silva',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 7,
    tags: ['passe'],
    isFixedList: false,
  },
  {
    id: '2',
    displayName: 'Bruno GK',
    isGoalkeeper: true,
    position: null,
    rating: 6,
    tags: [],
    isFixedList: true,
  },
];

describe('roster list logic (3.7)', () => {
  it('rótulo de posição', () => {
    expect(rosterPositionLabel(sample[1])).toBe('Goleiro');
    expect(rosterPositionLabel(sample[0])).toBe('Meio');
  });

  it('filtra goleiros e linha', () => {
    expect(filterRosterBySegment(sample, 'gk').length).toBe(1);
    expect(filterRosterBySegment(sample, 'line').length).toBe(1);
  });

  it('busca por nome (pt-BR)', () => {
    expect(filterRosterBySearch(sample, 'ana').length).toBe(1);
    expect(filterRosterBySearch(sample, 'xyz').length).toBe(0);
  });

  it('combina segmento e busca', () => {
    expect(filterRosterList(sample, 'gk', 'bru').length).toBe(1);
    expect(filterRosterList(sample, 'line', 'bru').length).toBe(0);
  });

  it('formata nota para exibição', () => {
    expect(formatRosterRating(8)).toBe('8');
    expect(formatRosterRating(null)).toBe('—');
  });
});

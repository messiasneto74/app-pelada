import type { RosterPlayer } from '../roster/roster-player.model';
import {
  assemblePresenceRows,
  buildInitialStatusMap,
  dashboardConfirmedIdsForSeed,
  filterPresenceBySegment,
  initializePlayerPresence,
  orgTogglePlayer,
  presenceCounts,
  promoteNextFromQueue,
  resolveGuest,
  setPlayerPresenceStatus,
  statusChipLabel,
  vacancyFillPercent,
} from './presence-list.logic';
import type { PresenceRow } from './presence-attendance.model';

const roster: RosterPlayer[] = [
  {
    id: 'f1',
    displayName: 'Fixo A',
    isGoalkeeper: false,
    position: 'Defesa',
    rating: 7,
    tags: [],
    isFixedList: true,
  },
  {
    id: 'p1',
    displayName: 'Pedro',
    isGoalkeeper: false,
    position: 'Meio',
    rating: 6,
    tags: [],
    isFixedList: false,
  },
  {
    id: 'p2',
    displayName: 'Quinta',
    isGoalkeeper: false,
    position: 'Ataque',
    rating: 8,
    tags: [],
    isFixedList: false,
  },
];

describe('presence-list.logic', () => {
  it('initializePlayerPresence prioriza fixos até a capacidade', () => {
    const map = initializePlayerPresence(roster, 1);
    expect(map.get('f1')).toBe('confirmed');
    expect(map.get('p1')).toBe('pending');
  });

  it('dashboardConfirmedIdsForSeed ignora preview truncado', () => {
    const preview = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}` }));
    expect(dashboardConfirmedIdsForSeed(10, preview)).toEqual([]);
    expect(dashboardConfirmedIdsForSeed(8, preview).length).toBe(8);
  });

  it('buildInitialStatusMap com seed vazio quando dashboard truncado', () => {
    const preview = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}` }));
    const apiIds = dashboardConfirmedIdsForSeed(10, preview);
    expect(apiIds).toEqual([]);
    const map = buildInitialStatusMap(roster, 14, apiIds, null);
    expect(map.get('f1')).toBe('confirmed');
    expect(map.get('p1')).toBe('pending');
  });

  it('presenceCounts e vacancyFillPercent', () => {
    const rows: PresenceRow[] = [
      {
        kind: 'player',
        player: roster[0],
        status: 'confirmed',
      },
      {
        kind: 'player',
        player: roster[1],
        status: 'queue',
      },
    ];
    expect(presenceCounts(rows)).toEqual({
      confirmed: 1,
      pending: 0,
      queue: 1,
      guestPending: 0,
    });
    expect(vacancyFillPercent(1, 4)).toBe(25);
  });

  it('confirmar acima da capacidade envia para fila', () => {
    const rows: PresenceRow[] = roster.map((player) => ({
      kind: 'player' as const,
      player,
      status: 'confirmed' as const,
    }));
    const { rows: next } = setPlayerPresenceStatus(rows, 'p2', 'confirmed', 2, []);
    const p2 = next.find((r) => r.kind === 'player' && r.player.id === 'p2');
    expect(p2?.kind === 'player' && p2.status).toBe('queue');
  });

  it('promoteNextFromQueue respeita ordem FIFO da fila', () => {
    const rows: PresenceRow[] = [
      { kind: 'player', player: roster[0], status: 'confirmed' },
      { kind: 'player', player: roster[1], status: 'queue' },
      { kind: 'player', player: roster[2], status: 'queue' },
    ];
    const order = ['p2', 'p1'];
    const { rows: next } = promoteNextFromQueue(rows, 2, order);
    const p2 = next.find((r) => r.kind === 'player' && r.player.id === 'p2');
    expect(p2?.kind === 'player' && p2.status).toBe('confirmed');
  });

  it('orgTogglePlayer promove fila ao remover confirmado (FIFO)', () => {
    const rows: PresenceRow[] = [
      { kind: 'player', player: roster[0], status: 'confirmed' },
      { kind: 'player', player: roster[1], status: 'confirmed' },
      { kind: 'player', player: roster[2], status: 'queue' },
    ];
    const order = ['p2'];
    const { rows: next } = orgTogglePlayer(rows, order, 'p1', 2);
    const p2 = next.find((r) => r.kind === 'player' && r.player.id === 'p2');
    expect(p2?.kind === 'player' && p2.status).toBe('confirmed');
  });

  it('filterPresenceBySegment inclui convidado pendente em Pendentes', () => {
    const guest: PresenceRow = {
      kind: 'guest',
      guestId: 'g1',
      displayName: 'Visitante',
      status: 'guest_pending',
    };
    const rows: PresenceRow[] = [
      { kind: 'player', player: roster[1], status: 'pending' },
      guest,
    ];
    expect(filterPresenceBySegment(rows, 'pending').length).toBe(2);
    expect(statusChipLabel(guest)).toBe('Convidado');
  });

  it('resolveGuest aceita com vaga ou fila e retorna extraPlayer', () => {
    const rows: PresenceRow[] = [
      { kind: 'player', player: roster[0], status: 'confirmed' },
      {
        kind: 'guest',
        guestId: 'g1',
        displayName: 'Visitante',
        status: 'guest_pending',
      },
    ];
    const full = resolveGuest(rows, [], 'g1', true, 1);
    const added = full.rows.find(
      (r) => r.kind === 'player' && r.player.id === 'guest-g1',
    );
    expect(added?.kind === 'player' && added.status).toBe('queue');
    expect(full.extraPlayer?.displayName).toBe('Visitante');

    const withRoom = resolveGuest(rows, [], 'g1', true, 2);
    const added2 = withRoom.rows.find(
      (r) => r.kind === 'player' && r.player.id === 'guest-g1',
    );
    expect(added2?.kind === 'player' && added2.status).toBe('confirmed');
  });

  it('assemblePresenceRows inclui jogadores extras fora do elenco', () => {
    const map = new Map<string, 'confirmed'>([['guest-g1', 'confirmed']]);
    const extra = [
      {
        id: 'guest-g1',
        displayName: 'Visitante',
        isGoalkeeper: false,
        position: 'Convidado',
        rating: 5,
        tags: [],
        isFixedList: false,
      },
    ];
    const rows = assemblePresenceRows(roster, map, [], extra);
    expect(rows.some((r) => r.kind === 'player' && r.player.id === 'guest-g1')).toBe(
      true,
    );
  });
});

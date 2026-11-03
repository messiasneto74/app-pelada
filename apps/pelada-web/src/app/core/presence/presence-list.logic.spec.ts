import type { RosterPlayer } from '../roster/roster-player.model';
import {
  buildInitialStatusMap,
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
    const next = setPlayerPresenceStatus(rows, 'p2', 'confirmed', 2);
    const p2 = next.find((r) => r.kind === 'player' && r.player.id === 'p2');
    expect(p2?.kind === 'player' && p2.status).toBe('queue');
  });

  it('orgTogglePlayer promove fila ao remover confirmado', () => {
    const rows: PresenceRow[] = [
      { kind: 'player', player: roster[0], status: 'confirmed' },
      { kind: 'player', player: roster[1], status: 'confirmed' },
      { kind: 'player', player: roster[2], status: 'queue' },
    ];
    const next = orgTogglePlayer(rows, 'p1', 2);
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

  it('resolveGuest aceita com vaga ou fila', () => {
    const rows: PresenceRow[] = [
      { kind: 'player', player: roster[0], status: 'confirmed' },
      {
        kind: 'guest',
        guestId: 'g1',
        displayName: 'Visitante',
        status: 'guest_pending',
      },
    ];
    const full = resolveGuest(rows, 'g1', true, 1);
    const added = full.find((r) => r.kind === 'player' && r.player.id === 'guest-g1');
    expect(added?.kind === 'player' && added.status).toBe('queue');

    const withRoom = resolveGuest(rows, 'g1', true, 2);
    const added2 = withRoom.find(
      (r) => r.kind === 'player' && r.player.id === 'guest-g1',
    );
    expect(added2?.kind === 'player' && added2.status).toBe('confirmed');
  });

  it('buildInitialStatusMap mescla confirmados da API', () => {
    const map = buildInitialStatusMap(roster, 2, ['p2'], null);
    expect(map.get('f1')).toBe('confirmed');
    expect(map.get('p2')).toBe('confirmed');
  });

  it('promoteNextFromQueue preenche vaga', () => {
    const rows: PresenceRow[] = [
      { kind: 'player', player: roster[0], status: 'confirmed' },
      { kind: 'player', player: roster[2], status: 'queue' },
    ];
    const next = promoteNextFromQueue(rows, 2);
    const p2 = next.find((r) => r.kind === 'player' && r.player.id === 'p2');
    expect(p2?.kind === 'player' && p2.status).toBe('confirmed');
  });
});

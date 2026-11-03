import type { RosterPlayer } from '../roster/roster-player.model';
import type {
  PlayerPresenceStatus,
  PresenceRow,
  PresenceSegment,
} from './presence-attendance.model';

export function presenceCounts(rows: PresenceRow[]): {
  confirmed: number;
  pending: number;
  queue: number;
  guestPending: number;
} {
  let confirmed = 0;
  let pending = 0;
  let queue = 0;
  let guestPending = 0;
  for (const row of rows) {
    if (row.kind === 'guest') {
      if (row.status === 'guest_pending') {
        guestPending += 1;
        pending += 1;
      }
      continue;
    }
    if (row.status === 'confirmed') confirmed += 1;
    else if (row.status === 'queue') queue += 1;
    else pending += 1;
  }
  return { confirmed, pending, queue, guestPending };
}

export function vacancyFillPercent(confirmed: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((confirmed / capacity) * 100));
}

export function filterPresenceBySegment(
  rows: PresenceRow[],
  segment: PresenceSegment,
): PresenceRow[] {
  return rows.filter((row) => {
    if (row.kind === 'guest') {
      return segment === 'pending' && row.status === 'guest_pending';
    }
    return row.status === segment;
  });
}

export function initializePlayerPresence(
  roster: RosterPlayer[],
  capacity: number,
): Map<string, PlayerPresenceStatus> {
  const map = new Map<string, PlayerPresenceStatus>();
  let confirmed = 0;
  const fixedFirst = [...roster].sort(
    (a, b) => Number(b.isFixedList) - Number(a.isFixedList),
  );
  for (const p of fixedFirst) {
    if (p.isFixedList && confirmed < capacity) {
      map.set(p.id, 'confirmed');
      confirmed += 1;
    } else {
      map.set(p.id, 'pending');
    }
  }
  return map;
}

export function setPlayerPresenceStatus(
  rows: PresenceRow[],
  playerId: string,
  next: PlayerPresenceStatus,
  capacity: number,
): PresenceRow[] {
  const counts = presenceCounts(rows);
  if (next === 'confirmed' && counts.confirmed >= capacity) {
    next = 'queue';
  }
  return rows.map((row) => {
    if (row.kind !== 'player' || row.player.id !== playerId) {
      return row;
    }
    return { ...row, status: next };
  });
}

export function promoteNextFromQueue(
  rows: PresenceRow[],
  capacity: number,
): PresenceRow[] {
  const counts = presenceCounts(rows);
  if (counts.confirmed >= capacity) {
    return rows;
  }
  const next = rows.find(
    (r) => r.kind === 'player' && r.status === 'queue',
  );
  if (!next || next.kind !== 'player') {
    return rows;
  }
  return setPlayerPresenceStatus(rows, next.player.id, 'confirmed', capacity);
}

export function statusChipLabel(row: PresenceRow): string {
  if (row.kind === 'guest') {
    return row.status === 'guest_pending' ? 'Convidado' : 'Recusado';
  }
  switch (row.status) {
    case 'confirmed':
      return 'Confirmou';
    case 'queue':
      return 'Na fila';
    default:
      return 'Sem resposta';
  }
}

export function rowsFromRosterAndMap(
  roster: RosterPlayer[],
  statusByPlayerId: Map<string, PlayerPresenceStatus>,
  guests: PresenceRow[],
): PresenceRow[] {
  const players: PresenceRow[] = roster.map((player) => ({
    kind: 'player',
    player,
    status: statusByPlayerId.get(player.id) ?? 'pending',
  }));
  return [...players, ...guests];
}

export function buildInitialStatusMap(
  roster: RosterPlayer[],
  capacity: number,
  apiConfirmedIds: readonly string[],
  persisted: Record<string, PlayerPresenceStatus> | null,
): Map<string, PlayerPresenceStatus> {
  if (persisted && Object.keys(persisted).length > 0) {
    return new Map(Object.entries(persisted));
  }
  const map = initializePlayerPresence(roster, capacity);
  let confirmed = [...map.values()].filter((s) => s === 'confirmed').length;
  for (const id of apiConfirmedIds) {
    if (!map.has(id)) {
      continue;
    }
    if (map.get(id) === 'confirmed') {
      continue;
    }
    if (confirmed < capacity) {
      map.set(id, 'confirmed');
      confirmed += 1;
    } else {
      map.set(id, 'queue');
    }
  }
  return map;
}

export function orgTogglePlayer(
  rows: PresenceRow[],
  playerId: string,
  capacity: number,
): PresenceRow[] {
  const target = rows.find(
    (r) => r.kind === 'player' && r.player.id === playerId,
  );
  if (!target || target.kind !== 'player') {
    return rows;
  }
  if (target.status === 'confirmed') {
    const pending = setPlayerPresenceStatus(rows, playerId, 'pending', capacity);
    return promoteNextFromQueue(pending, capacity);
  }
  if (target.status === 'queue') {
    return setPlayerPresenceStatus(rows, playerId, 'pending', capacity);
  }
  return setPlayerPresenceStatus(rows, playerId, 'confirmed', capacity);
}

export function selfSetPlayerStatus(
  rows: PresenceRow[],
  playerId: string,
  accept: boolean,
  capacity: number,
): PresenceRow[] {
  const target = rows.find(
    (r) => r.kind === 'player' && r.player.id === playerId,
  );
  if (!target || target.kind !== 'player') {
    return rows;
  }
  if (!accept) {
    let next = setPlayerPresenceStatus(rows, playerId, 'pending', capacity);
    if (target.status === 'confirmed') {
      next = promoteNextFromQueue(next, capacity);
    }
    return next;
  }
  return setPlayerPresenceStatus(rows, playerId, 'confirmed', capacity);
}

export function resolveGuest(
  rows: PresenceRow[],
  guestId: string,
  accept: boolean,
  capacity: number,
): PresenceRow[] {
  const guest = rows.find((r) => r.kind === 'guest' && r.guestId === guestId);
  if (!guest || guest.kind !== 'guest') {
    return rows;
  }
  if (!accept) {
    return rows.map((row) =>
      row.kind === 'guest' && row.guestId === guestId
        ? { ...row, status: 'guest_declined' as const }
        : row,
    );
  }
  const withoutGuest = rows.filter(
    (r) => !(r.kind === 'guest' && r.guestId === guestId),
  );
  const counts = presenceCounts(withoutGuest);
  const status: PlayerPresenceStatus =
    counts.confirmed < capacity ? 'confirmed' : 'queue';
  const playerRow: PresenceRow = {
    kind: 'player',
    player: {
      id: `guest-${guestId}`,
      displayName: guest.displayName,
      isGoalkeeper: false,
      position: 'Convidado',
      rating: 5,
      tags: [],
      isFixedList: false,
    },
    status,
  };
  return [...withoutGuest, playerRow];
}

export function segmentOptionsWithCounts(counts: {
  confirmed: number;
  pending: number;
  queue: number;
}): Array<{ value: PresenceSegment; label: string }> {
  return [
    { value: 'confirmed', label: `Confirmados (${counts.confirmed})` },
    { value: 'pending', label: `Pendentes (${counts.pending})` },
    { value: 'queue', label: `Fila (${counts.queue})` },
  ];
}

export function vacancySummary(confirmed: number, capacity: number): string {
  return `${confirmed} de ${capacity} vagas`;
}

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

/** Dashboard envia no máximo 8 confirmados; não seedar lista parcial. */
export function dashboardConfirmedIdsForSeed(
  confirmedCount: number,
  confirmedPlayers: readonly { id: string }[],
): string[] {
  if (confirmedPlayers.length < confirmedCount) {
    return [];
  }
  return confirmedPlayers.map((p) => p.id);
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

export function firstQueuedPlayerId(
  queueOrder: readonly string[],
  rows: PresenceRow[],
): string | null {
  for (const id of queueOrder) {
    const row = rows.find(
      (r) => r.kind === 'player' && r.player.id === id && r.status === 'queue',
    );
    if (row) {
      return id;
    }
  }
  return null;
}

export function applyPlayerStatusChange(
  rows: PresenceRow[],
  queueOrder: readonly string[],
  playerId: string,
  requested: PlayerPresenceStatus,
  capacity: number,
): { rows: PresenceRow[]; queueOrder: string[] } {
  let next = requested;
  if (requested === 'confirmed') {
    const counts = presenceCounts(rows);
    if (counts.confirmed >= capacity) {
      next = 'queue';
    }
  }
  const prev = rows.find(
    (r) => r.kind === 'player' && r.player.id === playerId,
  );
  const prevStatus = prev?.kind === 'player' ? prev.status : undefined;

  const newRows = rows.map((row) => {
    if (row.kind !== 'player' || row.player.id !== playerId) {
      return row;
    }
    return { ...row, status: next };
  });

  let newOrder = [...queueOrder];
  if (prevStatus === 'queue' && next !== 'queue') {
    newOrder = newOrder.filter((id) => id !== playerId);
  }
  if (next === 'queue' && prevStatus !== 'queue') {
    if (!newOrder.includes(playerId)) {
      newOrder = [...newOrder, playerId];
    }
  }
  return { rows: newRows, queueOrder: newOrder };
}

export function setPlayerPresenceStatus(
  rows: PresenceRow[],
  playerId: string,
  next: PlayerPresenceStatus,
  capacity: number,
  queueOrder: readonly string[] = [],
): { rows: PresenceRow[]; queueOrder: string[] } {
  return applyPlayerStatusChange(rows, queueOrder, playerId, next, capacity);
}

export function promoteNextFromQueue(
  rows: PresenceRow[],
  capacity: number,
  queueOrder: readonly string[],
): { rows: PresenceRow[]; queueOrder: string[] } {
  const counts = presenceCounts(rows);
  if (counts.confirmed >= capacity) {
    return { rows, queueOrder: [...queueOrder] };
  }
  const nextId = firstQueuedPlayerId(queueOrder, rows);
  if (!nextId) {
    return { rows, queueOrder: [...queueOrder] };
  }
  return applyPlayerStatusChange(rows, queueOrder, nextId, 'confirmed', capacity);
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

export function assemblePresenceRows(
  roster: RosterPlayer[],
  statusByPlayerId: Map<string, PlayerPresenceStatus>,
  guests: PresenceRow[],
  extraPlayers: RosterPlayer[] = [],
): PresenceRow[] {
  const rosterRows: PresenceRow[] = roster.map((player) => ({
    kind: 'player',
    player,
    status: statusByPlayerId.get(player.id) ?? 'pending',
  }));
  const extraRows: PresenceRow[] = extraPlayers.map((player) => ({
    kind: 'player',
    player,
    status: statusByPlayerId.get(player.id) ?? 'pending',
  }));
  return [...rosterRows, ...extraRows, ...guests];
}

/** @deprecated use assemblePresenceRows */
export function rowsFromRosterAndMap(
  roster: RosterPlayer[],
  statusByPlayerId: Map<string, PlayerPresenceStatus>,
  guests: PresenceRow[],
): PresenceRow[] {
  return assemblePresenceRows(roster, statusByPlayerId, guests);
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
  queueOrder: readonly string[],
  playerId: string,
  capacity: number,
): { rows: PresenceRow[]; queueOrder: string[] } {
  const target = rows.find(
    (r) => r.kind === 'player' && r.player.id === playerId,
  );
  if (!target || target.kind !== 'player') {
    return { rows, queueOrder: [...queueOrder] };
  }
  if (target.status === 'confirmed') {
    const pending = applyPlayerStatusChange(
      rows,
      queueOrder,
      playerId,
      'pending',
      capacity,
    );
    return promoteNextFromQueue(pending.rows, capacity, pending.queueOrder);
  }
  if (target.status === 'queue') {
    return applyPlayerStatusChange(rows, queueOrder, playerId, 'pending', capacity);
  }
  return applyPlayerStatusChange(rows, queueOrder, playerId, 'confirmed', capacity);
}

export function selfSetPlayerStatus(
  rows: PresenceRow[],
  queueOrder: readonly string[],
  playerId: string,
  accept: boolean,
  capacity: number,
): { rows: PresenceRow[]; queueOrder: string[] } {
  const target = rows.find(
    (r) => r.kind === 'player' && r.player.id === playerId,
  );
  if (!target || target.kind !== 'player') {
    return { rows, queueOrder: [...queueOrder] };
  }
  if (!accept) {
    const pending = applyPlayerStatusChange(
      rows,
      queueOrder,
      playerId,
      'pending',
      capacity,
    );
    if (target.status === 'confirmed') {
      return promoteNextFromQueue(pending.rows, capacity, pending.queueOrder);
    }
    return pending;
  }
  return applyPlayerStatusChange(rows, queueOrder, playerId, 'confirmed', capacity);
}

export function guestPlayerFromGuest(
  guestId: string,
  displayName: string,
): RosterPlayer {
  return {
    id: `guest-${guestId}`,
    displayName,
    isGoalkeeper: false,
    position: 'Convidado',
    rating: 5,
    tags: [],
    isFixedList: false,
  };
}

export function resolveGuest(
  rows: PresenceRow[],
  queueOrder: readonly string[],
  guestId: string,
  accept: boolean,
  capacity: number,
): { rows: PresenceRow[]; queueOrder: string[]; extraPlayer?: RosterPlayer } {
  const guest = rows.find((r) => r.kind === 'guest' && r.guestId === guestId);
  if (!guest || guest.kind !== 'guest') {
    return { rows, queueOrder: [...queueOrder] };
  }
  if (!accept) {
    return {
      rows: rows.map((row) =>
        row.kind === 'guest' && row.guestId === guestId
          ? { ...row, status: 'guest_declined' as const }
          : row,
      ),
      queueOrder: [...queueOrder],
    };
  }
  const withoutGuest = rows.filter(
    (r) => !(r.kind === 'guest' && r.guestId === guestId),
  );
  const player = guestPlayerFromGuest(guestId, guest.displayName);
  const counts = presenceCounts(withoutGuest);
  const status: PlayerPresenceStatus =
    counts.confirmed < capacity ? 'confirmed' : 'queue';
  const playerRow: PresenceRow = {
    kind: 'player',
    player,
    status,
  };
  let order = [...queueOrder];
  const merged = [...withoutGuest, playerRow];
  if (status === 'queue') {
    order = order.includes(player.id) ? order : [...order, player.id];
  }
  return { rows: merged, queueOrder: order, extraPlayer: player };
}

export function extraPlayersFromRows(
  rows: PresenceRow[],
  rosterIds: ReadonlySet<string>,
): RosterPlayer[] {
  return rows
    .filter(
      (r) => r.kind === 'player' && !rosterIds.has(r.player.id),
    )
    .map((r) => (r.kind === 'player' ? r.player : null))
    .filter((p): p is RosterPlayer => p !== null);
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

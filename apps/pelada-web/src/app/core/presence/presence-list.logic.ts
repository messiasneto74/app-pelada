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

export function statusChipLabel(
  row: PresenceRow,
  queueOrder: readonly string[] = [],
): string {
  if (row.kind === 'guest') {
    return row.status === 'guest_pending' ? 'Convidado' : 'Recusado';
  }
  switch (row.status) {
    case 'confirmed':
      return 'Confirmou';
    case 'queue': {
      // Issue #218 — posição na fila (1º, 2º…), sempre contada a partir de 1.
      const idx = queueOrder.indexOf(row.player.id);
      return idx >= 0 ? `${idx + 1}º na fila` : 'Na fila';
    }
    default:
      return 'Sem resposta';
  }
}

/**
 * Issue #218 — a aba Fila segue a ordem de chegada (quem confirmou ou pôs o
 * nome primeiro), não a ordem alfabética do elenco.
 */
export function sortRowsByQueueOrder(
  rows: PresenceRow[],
  queueOrder: readonly string[],
): PresenceRow[] {
  const pos = (row: PresenceRow) => {
    const idx = row.kind === 'player' ? queueOrder.indexOf(row.player.id) : -1;
    return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
  };
  return [...rows].sort((a, b) => pos(a) - pos(b));
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
    userId: null,
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

/** Entrada mínima de `GET .../attendance` usada pra montar a lista local. */
export type AttendanceEntryInput = {
  playerId: string;
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'QUEUE';
  queuePosition: number | null;
  /** Issue #234 — quando o status mudou por último (ordem da lista numerada). */
  statusChangedAt?: string;
};

/**
 * Lista da API (fonte de verdade) → status por jogador + ordem da fila.
 * `DECLINED` aparece como pendente (a tela não tem aba de recusados).
 */
export function presenceFromAttendance(entries: readonly AttendanceEntryInput[]): {
  statusByPlayerId: Map<string, PlayerPresenceStatus>;
  queueOrder: string[];
  changedAtByPlayerId: Map<string, string>;
} {
  const statusByPlayerId = new Map<string, PlayerPresenceStatus>();
  const changedAtByPlayerId = new Map<string, string>();
  for (const e of entries) {
    if (e.statusChangedAt) {
      changedAtByPlayerId.set(e.playerId, e.statusChangedAt);
    }
    statusByPlayerId.set(
      e.playerId,
      e.status === 'CONFIRMED' ? 'confirmed' : e.status === 'QUEUE' ? 'queue' : 'pending',
    );
  }
  const queueOrder = entries
    .filter((e) => e.status === 'QUEUE')
    .slice()
    .sort(
      (a, b) =>
        (a.queuePosition ?? Number.MAX_SAFE_INTEGER) -
        (b.queuePosition ?? Number.MAX_SAFE_INTEGER),
    )
    .map((e) => e.playerId);
  return { statusByPlayerId, queueOrder, changedAtByPlayerId };
}

/** Issue #234 — uma linha da lista numerada (vazia = vaga livre). */
export type PresenceSlot = { label: string; row: PresenceRow | null };

export type PresenceSheet = {
  goalkeepers: PresenceSlot[];
  field: PresenceSlot[];
  waitlist: PresenceSlot[];
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Issue #234 — a lista de presença no formato do grupo do WhatsApp:
 *
 *   GOLEIROS: 1- 2-
 *   JOGADORES DE LINHA: 01- … (vagas da partida)
 *   LISTA DE ESPERA: continua a numeração (22- …)
 *
 * Confirmados entram na ordem de chegada; goleiros (cadastro do jogador)
 * ocupam as vagas de goleiro primeiro e, se sobrar goleiro, vai pra linha.
 * Lista de espera na ordem da fila; sem limite nas Regras mostra só quem está nela.
 */
export function buildPresenceSheet(input: {
  rows: PresenceRow[];
  queueOrder: readonly string[];
  changedAtByPlayerId: ReadonlyMap<string, string>;
  capacity: number;
  goalkeeperSlots: number;
  waitlistSlots: number;
}): PresenceSheet {
  const gkSlots = Math.max(0, Math.min(input.goalkeeperSlots, input.capacity));
  const fieldSlots = Math.max(0, input.capacity - gkSlots);
  const confirmed = sortRowsByArrival(
    input.rows.filter((r) => r.kind === 'player' && r.status === 'confirmed'),
    input.changedAtByPlayerId,
  );
  const gkRows: PresenceRow[] = [];
  const fieldRows: PresenceRow[] = [];
  for (const r of confirmed) {
    if (r.kind === 'player' && r.player.isGoalkeeper && gkRows.length < gkSlots) {
      gkRows.push(r);
    } else {
      fieldRows.push(r);
    }
  }
  const queued = sortRowsByQueueOrder(
    input.rows.filter((r) => r.kind === 'player' && r.status === 'queue'),
    input.queueOrder,
  );
  const fieldTotal = Math.max(fieldSlots, fieldRows.length);
  const waitTotal = input.waitlistSlots > 0 ? Math.max(input.waitlistSlots, queued.length) : queued.length;
  return {
    goalkeepers: Array.from({ length: gkSlots }, (_, i) => ({
      label: `${i + 1}-`,
      row: gkRows[i] ?? null,
    })),
    field: Array.from({ length: fieldTotal }, (_, i) => ({
      label: `${pad2(i + 1)}-`,
      row: fieldRows[i] ?? null,
    })),
    waitlist: Array.from({ length: waitTotal }, (_, i) => ({
      label: `${pad2(fieldTotal + i + 1)}-`,
      row: queued[i] ?? null,
    })),
  };
}

/**
 * Issue #234 — confirmados em ordem de chegada (quem entrou primeiro é o 1º).
 * Sem horário conhecido vai pro fim, na ordem em que veio.
 */
export function sortRowsByArrival(
  rows: PresenceRow[],
  changedAtByPlayerId: ReadonlyMap<string, string>,
): PresenceRow[] {
  const at = (row: PresenceRow) => {
    const iso = row.kind === 'player' ? changedAtByPlayerId.get(row.player.id) : undefined;
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  };
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => at(a.row) - at(b.row) || a.i - b.i)
    .map((x) => x.row);
}

/** Issue #234 — jogadores que o adm ainda pode pôr na lista (fora dos confirmados e da espera). */
export function playersOutOfList(rows: PresenceRow[]): PresenceRow[] {
  return rows
    .filter((r) => r.kind === 'player' && r.status === 'pending')
    .sort((a, b) =>
      a.kind === 'player' && b.kind === 'player'
        ? a.player.displayName.localeCompare(b.player.displayName, 'pt-BR')
        : 0,
    );
}

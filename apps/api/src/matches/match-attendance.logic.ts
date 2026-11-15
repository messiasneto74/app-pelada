import type { AttendanceStatus } from '@prisma/client';

export type AttendanceRowInput = {
  playerId: string;
  status: AttendanceStatus;
  queuePosition: number | null;
  isGuest: boolean;
  /** Jogador fixo tem prioridade sobre jogador comum na fila. */
  isFixedList: boolean;
};

/**
 * Sem `capacity` manual, o padrão é só os titulares de todos os times
 * (`playersPerTeam × teamCount`) — nem toda pelada tem banco de reserva.
 */
export function computeMatchCapacityFromRules(
  rules: {
    capacity: number | null;
    playersPerTeam: number;
    teamCount: number;
  },
): number {
  if (typeof rules.capacity === 'number' && rules.capacity > 0) {
    return rules.capacity;
  }
  return rules.playersPerTeam * rules.teamCount;
}

export function countConfirmed(rows: AttendanceRowInput[]): number {
  return rows.filter((r) => r.status === 'CONFIRMED').length;
}

/** Ao confirmar com lista cheia, vira fila; demais status passam direto. */
export function resolveNextStatus(
  requested: AttendanceStatus,
  confirmedCount: number,
  capacity: number,
): AttendanceStatus {
  if (requested !== 'CONFIRMED') {
    return requested;
  }
  if (confirmedCount >= capacity) {
    return 'QUEUE';
  }
  return 'CONFIRMED';
}

export function nextQueuePosition(rows: AttendanceRowInput[]): number {
  const positions = rows
    .filter((r) => r.status === 'QUEUE' && r.queuePosition != null)
    .map((r) => r.queuePosition as number);
  if (positions.length === 0) {
    return 1;
  }
  return Math.max(...positions) + 1;
}

export function pickNextQueuedPlayerId(rows: AttendanceRowInput[]): string | null {
  const queued = rows
    .filter((r) => r.status === 'QUEUE')
    .sort((a, b) => {
      if (a.isFixedList !== b.isFixedList) {
        return Number(b.isFixedList) - Number(a.isFixedList);
      }
      const pa = a.queuePosition ?? Number.MAX_SAFE_INTEGER;
      const pb = b.queuePosition ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) {
        return pa - pb;
      }
      return a.playerId.localeCompare(b.playerId);
    });
  return queued[0]?.playerId ?? null;
}

export function applyAttendanceStatusChange(
  rows: AttendanceRowInput[],
  playerId: string,
  requested: AttendanceStatus,
  capacity: number,
): AttendanceRowInput[] {
  const target = rows.find((r) => r.playerId === playerId);
  if (!target) {
    return rows;
  }
  const confirmedBefore = countConfirmed(rows);
  const wasConfirmed = target.status === 'CONFIRMED';

  // Um jogador fixo não pode ficar atrás de um jogador comum já confirmado.
  // Quando a lista está cheia, a confirmação do fixo ocupa a vaga e o último
  // jogador comum confirmado vai para o fim da fila.
  if (
    requested === 'CONFIRMED' &&
    target.isFixedList &&
    !wasConfirmed &&
    confirmedBefore >= capacity
  ) {
    const demote = [...rows]
      .reverse()
      .find((row) => row.status === 'CONFIRMED' && !row.isFixedList);
    if (demote) {
      const queuePosition = nextQueuePosition(rows);
      return rows.map((row) => {
        if (row.playerId === playerId) {
          return { ...row, status: 'CONFIRMED' as const, queuePosition: null };
        }
        if (row.playerId === demote.playerId) {
          return { ...row, status: 'QUEUE' as const, queuePosition };
        }
        return row;
      });
    }
  }

  let next = resolveNextStatus(requested, confirmedBefore, capacity);

  let updated = rows.map((row) => {
    if (row.playerId !== playerId) {
      return row;
    }
    if (next === 'QUEUE') {
      return {
        ...row,
        status: 'QUEUE' as const,
        queuePosition: row.queuePosition ?? nextQueuePosition(rows),
      };
    }
    return {
      ...row,
      status: next,
      queuePosition: null,
    };
  });

  if (wasConfirmed && next !== 'CONFIRMED') {
    const promoteId = pickNextQueuedPlayerId(updated);
    if (promoteId && countConfirmed(updated) < capacity) {
      updated = applyAttendanceStatusChange(
        updated,
        promoteId,
        'CONFIRMED',
        capacity,
      );
    }
  }

  return updated;
}

export function attendanceCounts(rows: AttendanceRowInput[]): {
  confirmed: number;
  pending: number;
  queue: number;
  declined: number;
} {
  let confirmed = 0;
  let pending = 0;
  let queue = 0;
  let declined = 0;
  for (const row of rows) {
    switch (row.status) {
      case 'CONFIRMED':
        confirmed += 1;
        break;
      case 'QUEUE':
        queue += 1;
        break;
      case 'DECLINED':
        declined += 1;
        break;
      default:
        pending += 1;
    }
  }
  return { confirmed, pending, queue, declined };
}

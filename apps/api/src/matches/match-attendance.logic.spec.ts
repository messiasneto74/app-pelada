import {
  applyAttendanceStatusChange,
  attendanceCounts,
  computeMatchCapacityFromRules,
  fillFreeSpotsFromQueue,
  readAutoFillQueueOnCapacityIncrease,
  nextQueuePosition,
  pickNextQueuedPlayerId,
  resolveNextStatus,
  type AttendanceRowInput,
} from './match-attendance.logic';

describe('match-attendance.logic', () => {
  const capacity = 2;

  it('resolveNextStatus envia para fila quando cheio', () => {
    expect(resolveNextStatus('CONFIRMED', 2, capacity)).toBe('QUEUE');
    expect(resolveNextStatus('CONFIRMED', 1, capacity)).toBe('CONFIRMED');
  });

  it('promove FIFO ao liberar vaga', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'a', status: 'CONFIRMED', queuePosition: null, isGuest: false, isFixedList: false },
      { playerId: 'b', status: 'CONFIRMED', queuePosition: null, isGuest: false, isFixedList: false },
      { playerId: 'c', status: 'QUEUE', queuePosition: 2, isGuest: false, isFixedList: false },
      { playerId: 'd', status: 'QUEUE', queuePosition: 1, isGuest: false, isFixedList: false },
    ];
    const next = applyAttendanceStatusChange(rows, 'b', 'PENDING', capacity);
    expect(next.find((r) => r.playerId === 'd')?.status).toBe('CONFIRMED');
    expect(next.find((r) => r.playerId === 'c')?.status).toBe('QUEUE');
  });

  it('reconfirmar quem já está confirmado com a lista cheia não mexe na fila', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'c', status: 'QUEUE', queuePosition: 1, isGuest: false, isFixedList: false },
      { playerId: 'a', status: 'CONFIRMED', queuePosition: null, isGuest: false, isFixedList: false },
      { playerId: 'b', status: 'CONFIRMED', queuePosition: null, isGuest: false, isFixedList: false },
    ];
    let next = applyAttendanceStatusChange(rows, 'c', 'QUEUE', capacity);
    next = applyAttendanceStatusChange(next, 'a', 'CONFIRMED', capacity);
    next = applyAttendanceStatusChange(next, 'b', 'CONFIRMED', capacity);
    expect(next).toEqual(rows);
  });

  it('nextQueuePosition incrementa', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'a', status: 'QUEUE', queuePosition: 1, isGuest: false, isFixedList: false },
    ];
    expect(nextQueuePosition(rows)).toBe(2);
  });

  it('attendanceCounts', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'a', status: 'CONFIRMED', queuePosition: null, isGuest: false, isFixedList: false },
      { playerId: 'b', status: 'PENDING', queuePosition: null, isGuest: false, isFixedList: false },
      { playerId: 'c', status: 'QUEUE', queuePosition: 1, isGuest: false, isFixedList: false },
    ];
    expect(attendanceCounts(rows)).toEqual({
      confirmed: 1,
      pending: 1,
      queue: 1,
      declined: 0,
    });
  });

  it('computeMatchCapacityFromRules usa fallback linha×times', () => {
    expect(
      computeMatchCapacityFromRules({
        capacity: null,
        playersPerTeam: 6,
        teamCount: 2,
      }),
    ).toBe(12);
  });

  it('pickNextQueuedPlayerId respeita queuePosition', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'z', status: 'QUEUE', queuePosition: 5, isGuest: false, isFixedList: false },
      { playerId: 'y', status: 'QUEUE', queuePosition: 1, isGuest: false, isFixedList: false },
    ];
    expect(pickNextQueuedPlayerId(rows)).toBe('y');
  });

  it('prioriza jogador fixo antes da posição FIFO da fila', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'normal', status: 'QUEUE', queuePosition: 1, isGuest: false, isFixedList: false },
      { playerId: 'fixo', status: 'QUEUE', queuePosition: 2, isGuest: false, isFixedList: true },
    ];
    expect(pickNextQueuedPlayerId(rows)).toBe('fixo');
  });

  it('permite que fixo ultrapasse comum já confirmado quando a lista está cheia', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'comum', status: 'CONFIRMED', queuePosition: null, isGuest: false, isFixedList: false },
      { playerId: 'fixo', status: 'PENDING', queuePosition: null, isGuest: false, isFixedList: true },
    ];
    const next = applyAttendanceStatusChange(rows, 'fixo', 'CONFIRMED', 1);
    expect(next.find((r) => r.playerId === 'fixo')).toMatchObject({
      status: 'CONFIRMED',
      queuePosition: null,
    });
    expect(next.find((r) => r.playerId === 'comum')).toMatchObject({
      status: 'QUEUE',
      queuePosition: 1,
    });
  });

  describe('puxar a fila ao aumentar as vagas (issue #230)', () => {
    const r = (playerId: string, status: AttendanceRowInput['status'], queuePosition: number | null, isFixedList = false): AttendanceRowInput =>
      ({ playerId, status, queuePosition, isGuest: false, isFixedList });

    it('sobem os primeiros da fila até preencher as vagas', () => {
      const rows = [r('a', 'CONFIRMED', null), r('b', 'CONFIRMED', null), r('q2', 'QUEUE', 2), r('q1', 'QUEUE', 1), r('q3', 'QUEUE', 3)];
      const next = fillFreeSpotsFromQueue(rows, 4);
      expect(next.filter((x) => x.status === 'CONFIRMED').map((x) => x.playerId).sort()).toEqual(['a', 'b', 'q1', 'q2']);
      expect(next.find((x) => x.playerId === 'q3')?.status).toBe('QUEUE');
    });

    it('fixo da fila tem prioridade; sem vaga livre ninguém sobe', () => {
      const rows = [r('a', 'CONFIRMED', null), r('q1', 'QUEUE', 1), r('fx', 'QUEUE', 2, true)];
      expect(fillFreeSpotsFromQueue(rows, 2).find((x) => x.playerId === 'fx')?.status).toBe('CONFIRMED');
      expect(fillFreeSpotsFromQueue(rows, 1)).toEqual(rows);
    });

    it('opção das Regras desligada por padrão', () => {
      expect(readAutoFillQueueOnCapacityIncrease({})).toBe(false);
      expect(readAutoFillQueueOnCapacityIncrease({ autoFillQueueOnCapacityIncrease: true })).toBe(true);
    });
  });
});

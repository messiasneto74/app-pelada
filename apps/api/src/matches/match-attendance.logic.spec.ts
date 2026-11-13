import {
  applyAttendanceStatusChange,
  attendanceCounts,
  computeMatchCapacityFromRules,
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
      { playerId: 'a', status: 'CONFIRMED', queuePosition: null, isGuest: false },
      { playerId: 'b', status: 'CONFIRMED', queuePosition: null, isGuest: false },
      { playerId: 'c', status: 'QUEUE', queuePosition: 2, isGuest: false },
      { playerId: 'd', status: 'QUEUE', queuePosition: 1, isGuest: false },
    ];
    const next = applyAttendanceStatusChange(rows, 'b', 'PENDING', capacity);
    expect(next.find((r) => r.playerId === 'd')?.status).toBe('CONFIRMED');
    expect(next.find((r) => r.playerId === 'c')?.status).toBe('QUEUE');
  });

  it('nextQueuePosition incrementa', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'a', status: 'QUEUE', queuePosition: 1, isGuest: false },
    ];
    expect(nextQueuePosition(rows)).toBe(2);
  });

  it('attendanceCounts', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'a', status: 'CONFIRMED', queuePosition: null, isGuest: false },
      { playerId: 'b', status: 'PENDING', queuePosition: null, isGuest: false },
      { playerId: 'c', status: 'QUEUE', queuePosition: 1, isGuest: false },
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
    ).toBe(24);
  });

  it('pickNextQueuedPlayerId respeita queuePosition', () => {
    const rows: AttendanceRowInput[] = [
      { playerId: 'z', status: 'QUEUE', queuePosition: 5, isGuest: false },
      { playerId: 'y', status: 'QUEUE', queuePosition: 1, isGuest: false },
    ];
    expect(pickNextQueuedPlayerId(rows)).toBe('y');
  });
});

import type {
  FieldRotationPolicy,
  MatchFieldSessionDto,
} from '../../core/match/match-field-session-api.model';

export function rotationPolicyLabel(policy: FieldRotationPolicy): string {
  switch (policy) {
    case 'WINNER_STAYS':
      return 'Ganha fica';
    case 'REST_QUEUE':
      return 'Rodízio com descanso';
    case 'SEQUENTIAL':
      return 'Sequencial (A×B, B×C…)';
    default:
      return policy;
  }
}

export function formatTimerLabel(totalMs: number): string {
  const sec = Math.max(0, Math.floor(totalMs / 1000));
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Espelha a API: elapsedMs + delta desde timerRunningSince. */
export function displayElapsedMs(
  session: Pick<
    MatchFieldSessionDto,
  'elapsedMs' | 'timerRunning' | 'timerRunningSince'
  >,
  nowMs: number = Date.now(),
): number {
  if (!session.timerRunning || !session.timerRunningSince) {
    return session.elapsedMs;
  }
  const since = Date.parse(session.timerRunningSince);
  if (Number.isNaN(since)) {
    return session.elapsedMs;
  }
  return session.elapsedMs + Math.max(0, nowMs - since);
}

export function homeTeamName(session: MatchFieldSessionDto): string {
  return session.teamsOnField.find((t) => t.role === 'HOME')?.name ?? 'Time A';
}

export function awayTeamName(session: MatchFieldSessionDto): string {
  return session.teamsOnField.find((t) => t.role === 'AWAY')?.name ?? 'Time B';
}

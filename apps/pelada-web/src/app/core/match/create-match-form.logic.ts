/** Valores do formulário §3.3 (criar partida). */
export type MatchPresenceMode = 'SELF_CONFIRM' | 'ORGANIZER_CLOSES';

export interface CreateMatchFormValues {
  date: string;
  time: string;
  location: string;
  notes: string;
  presenceMode: MatchPresenceMode;
}

export interface CreateMatchFormErrors {
  date?: string;
  time?: string;
  location?: string;
}

export interface CreateMatchRequestBody {
  scheduledAt: string;
  location?: string;
  notes?: string;
  presenceMode: MatchPresenceMode;
}

export const PRESENCE_MODE_OPTIONS: ReadonlyArray<{
  value: MatchPresenceMode;
  label: string;
  hint: string;
}> = [
  {
    value: 'ORGANIZER_CLOSES',
    label: 'Org. fecha lista',
    hint: 'Organizador confirma presenças e encerra a lista (padrão Resenha).',
  },
  {
    value: 'SELF_CONFIRM',
    label: 'Jogador confirma',
    hint: 'Cada jogador confirma ou recusa no app (quando disponível).',
  },
];

export function defaultCreateMatchForm(defaultLocation = ''): CreateMatchFormValues {
  let base = new Date();
  let date = formatDateInput(base);
  const time = '19:30';
  let scheduled = combineLocalDateAndTime(date, time);
  if (scheduled && scheduled.getTime() < Date.now() - 60_000) {
    base.setDate(base.getDate() + 1);
    date = formatDateInput(base);
  }
  return {
    date,
    time,
    location: defaultLocation.trim(),
    notes: '',
    presenceMode: 'ORGANIZER_CLOSES',
  };
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function combineLocalDateAndTime(
  dateStr: string,
  timeStr: string,
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  if (!/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return null;
  }
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (hh > 23 || mm > 59) {
    return null;
  }
  const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function validateCreateMatchForm(
  values: CreateMatchFormValues,
): CreateMatchFormErrors {
  const errors: CreateMatchFormErrors = {};
  const scheduled = combineLocalDateAndTime(values.date, values.time);
  if (!scheduled) {
    errors.date = 'Informe data e hora válidas.';
    errors.time = 'Informe data e hora válidas.';
  } else if (scheduled.getTime() < Date.now() - 60_000) {
    errors.date = 'A partida não pode ser no passado.';
  }
  if (values.location.trim().length > 200) {
    errors.location = 'Local: no máximo 200 caracteres.';
  }
  return errors;
}

export function isCreateMatchFormValid(values: CreateMatchFormValues): boolean {
  return Object.keys(validateCreateMatchForm(values)).length === 0;
}

export function buildCreateMatchRequest(
  values: CreateMatchFormValues,
): CreateMatchRequestBody | null {
  const errors = validateCreateMatchForm(values);
  if (Object.keys(errors).length > 0) {
    return null;
  }
  const scheduled = combineLocalDateAndTime(values.date, values.time)!;
  const body: CreateMatchRequestBody = {
    scheduledAt: scheduled.toISOString(),
    presenceMode: values.presenceMode,
  };
  const location = values.location.trim();
  const notes = values.notes.trim();
  if (location) {
    body.location = location;
  }
  if (notes) {
    body.notes = notes;
  }
  return body;
}

export function presenceModeLabel(mode: MatchPresenceMode): string {
  return (
    PRESENCE_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode
  );
}

export function rulesSummaryLine(input: {
  playersPerTeam: number;
  teamCount: number;
  modality: string;
}): string {
  return `${input.teamCount} times · ${input.playersPerTeam} de linha · ${input.modality}`;
}

/** Item de elenco na lista §3.7 (alinhado ao model Player da API). */
export type RosterPlayer = {
  id: string;
  displayName: string;
  isGoalkeeper: boolean;
  position: string | null;
  rating: number | null;
  tags: string[];
  isFixedList: boolean;
};

export type RosterSegment = 'all' | 'gk' | 'line';

export const ROSTER_SEGMENT_OPTIONS: { value: RosterSegment; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'gk', label: 'Goleiros' },
  { value: 'line', label: 'Linha' },
];

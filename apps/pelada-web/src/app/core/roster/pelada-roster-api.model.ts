/** Contrato previsto em 3.7-API (#25). */
export type PeladaRosterPlayerDto = {
  id: string;
  displayName: string;
  isGoalkeeper: boolean;
  position: string | null;
  rating: number | null;
  tags: string[];
  isFixedList: boolean;
};

export type PeladaRosterDto = {
  peladaId: string;
  players: PeladaRosterPlayerDto[];
};

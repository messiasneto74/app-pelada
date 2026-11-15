/** Contrato previsto em 3.7-API (#25). */
export type PeladaRosterPlayerDto = {
  id: string;
  displayName: string;
  isGoalkeeper: boolean;
  position: string | null;
  rating: number | null;
  tags: string[];
  isFixedList: boolean;
  userId?: string | null;
};

export type PeladaRosterDto = {
  peladaId: string;
  players: PeladaRosterPlayerDto[];
};

/** Body `POST /peladas/:id/players` (3.7-API). */
export type CreatePeladaPlayerBody = {
  displayName: string;
  isGoalkeeper?: boolean;
  isFixedList?: boolean;
};

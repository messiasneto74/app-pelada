export type PlayerPaymentPlan = 'PER_MATCH' | 'MONTHLY';

/** Contrato GET /peladas/:id/players/:playerId (3.7-API + §3.8). */
export type PeladaPlayerProfileDto = {
  id: string;
  displayName: string;
  isGoalkeeper: boolean;
  position: string | null;
  rating: number | null;
  tags: string[];
  isFixedList: boolean;
  userId: string | null;
  photoUrl: string | null;
  paymentPlan: PlayerPaymentPlan;
  attributes: Record<string, number>;
  /** Issue #232 — papel da conta vinculada na pelada (null sem conta). */
  memberRole?: 'ORGANIZADOR' | 'JOGADOR' | null;
  /** Issue #232 — a conta vinculada é quem criou a pelada. */
  isOwner?: boolean;
};

/** Pelada ativa no client até L1-API persistir no backend. */
export interface ActivePelada {
  id: string;
  name: string;
  defaultWeekday: number | null;
  defaultLocation: string;
  /** Object URL local (não persiste no sessionStorage). */
  photoPreviewUrl: string | null;
}

export const ACTIVE_PELADA_STORAGE_KEY = 'pelada:active-v1';

export type StoredActivePelada = Omit<ActivePelada, 'photoPreviewUrl'>;

/** `GET /me/peladas` (C1) — peladas do usuário autenticado, organizador primeiro. */
export interface MyPeladaSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  defaultWeekday: number | null;
  defaultLocation: string | null;
  role: string;
}

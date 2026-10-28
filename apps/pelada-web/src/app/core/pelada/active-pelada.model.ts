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

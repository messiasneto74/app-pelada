export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const WEEKDAY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

export interface CriarPeladaFormValues {
  name: string;
  defaultWeekday: number | null;
  defaultLocation: string;
}

export interface CriarPeladaFormErrors {
  name?: string;
  photo?: string;
}

const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateCriarPeladaForm(
  values: CriarPeladaFormValues,
): CriarPeladaFormErrors {
  const errors: CriarPeladaFormErrors = {};
  const name = values.name.trim();
  if (name.length < 2) {
    errors.name = 'Informe um nome com pelo menos 2 caracteres.';
  }
  return errors;
}

export function validatePeladaPhotoFile(file: File | null | undefined): string | null {
  if (!file) {
    return null;
  }
  if (!PHOTO_MIMES.has(file.type)) {
    return 'Use JPG, PNG ou WebP.';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'A foto deve ter no máximo 5 MB.';
  }
  return null;
}

export function isCriarPeladaFormValid(values: CriarPeladaFormValues): boolean {
  return Object.keys(validateCriarPeladaForm(values)).length === 0;
}

/** Mensagem amigável a partir da resposta de `POST /peladas`. */
export function mapCreatePeladaApiError(err: unknown): string {
  const http = err as { status?: number; error?: { message?: string | string[] } };
  const status = http?.status;
  const body = http.error;
  const apiMessage = Array.isArray(body?.message)
    ? body.message[0]
    : typeof body?.message === 'string'
      ? body.message
      : undefined;

  if (status === 401) {
    return 'Sessão expirada ou sem login. Volte em /entrar e tente de novo.';
  }
  if (status === 0) {
    return 'Não foi possível contactar a API. Confira se dev:api ou stack:up está no ar.';
  }
  if (status === 400 && apiMessage) {
    return apiMessage;
  }
  if (status === 413) {
    return apiMessage ?? 'A foto deve ter no máximo 5 MB.';
  }
  return 'Não foi possível criar a pelada. Tente de novo.';
}

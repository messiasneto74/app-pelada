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

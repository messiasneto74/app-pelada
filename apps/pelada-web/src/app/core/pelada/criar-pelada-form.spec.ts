import {
  isCriarPeladaFormValid,
  MAX_PHOTO_BYTES,
  validateCriarPeladaForm,
  validatePeladaPhotoFile,
  WEEKDAY_OPTIONS,
} from './criar-pelada-form';

describe('criar-pelada-form', () => {
  it('exige nome com pelo menos 2 caracteres', () => {
    expect(validateCriarPeladaForm({ name: 'A', defaultWeekday: null, defaultLocation: '' }).name).toBeTruthy();
    expect(isCriarPeladaFormValid({ name: 'Pelada', defaultWeekday: null, defaultLocation: '' })).toBe(true);
  });

  it('valida tipo e tamanho da foto', () => {
    const ok = new File([new Uint8Array(10)], 'f.jpg', { type: 'image/jpeg' });
    expect(validatePeladaPhotoFile(ok)).toBeNull();

    const big = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], 'f.jpg', { type: 'image/jpeg' });
    expect(validatePeladaPhotoFile(big)).toContain('5 MB');

    const bad = new File([new Uint8Array(10)], 'f.gif', { type: 'image/gif' });
    expect(validatePeladaPhotoFile(bad)).toContain('JPG');
  });

  it('lista dias da semana (0–6)', () => {
    expect(WEEKDAY_OPTIONS.length).toBe(7);
    expect(WEEKDAY_OPTIONS[0].value).toBe(0);
    expect(WEEKDAY_OPTIONS[6].value).toBe(6);
  });
});

/**
 * Valida PUBLIC_UPLOAD_BASE_URL antes do smoke staging (DEPLOY-1).
 * A API usa este valor nas URLs de foto; no compose precisa vir do .env do VPS.
 */
export function assertPublicUploadBaseUrlForStaging({
  apiBase = '',
  publicUploadBaseUrl = process.env.PUBLIC_UPLOAD_BASE_URL ?? '',
  error = console.error,
  onFatal = () => process.exit(1),
} = {}) {
  const api = apiBase.replace(/\/$/, '');
  const upload = publicUploadBaseUrl.trim().replace(/\/$/, '');

  if (!api.startsWith('https://')) {
    return true;
  }

  if (!upload) {
    error(
      'Defina PUBLIC_UPLOAD_BASE_URL no .env do VPS (ex.: https://api.staging.../uploads) — o serviço api do compose repassa essa variável.',
    );
    onFatal();
    return false;
  }

  if (/localhost|127\.0\.0\.1/i.test(upload)) {
    error(
      `PUBLIC_UPLOAD_BASE_URL (${upload}) não pode usar localhost quando a API pública é HTTPS (${api})`,
    );
    onFatal();
    return false;
  }

  if (!upload.startsWith('https://')) {
    error('PUBLIC_UPLOAD_BASE_URL deve usar HTTPS em staging');
    onFatal();
    return false;
  }

  return true;
}

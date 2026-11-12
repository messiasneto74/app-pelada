import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { assertPublicUploadBaseUrlForStaging } from './staging-public-upload-env.mjs';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

describe('staging-public-upload-env', () => {
  it('exige PUBLIC_UPLOAD_BASE_URL pública quando API é HTTPS', () => {
    const onFatal = vi.fn();
    const ok = assertPublicUploadBaseUrlForStaging({
      apiBase: 'https://api.staging.test',
      publicUploadBaseUrl: '',
      error: () => {},
      onFatal,
    });
    expect(ok).toBe(false);
    expect(onFatal).toHaveBeenCalled();
  });

  it('rejeita localhost em upload com API HTTPS', () => {
    const onFatal = vi.fn();
    const ok = assertPublicUploadBaseUrlForStaging({
      apiBase: 'https://api.staging.test',
      publicUploadBaseUrl: 'http://localhost:3000/uploads',
      error: () => {},
      onFatal,
    });
    expect(ok).toBe(false);
    expect(onFatal).toHaveBeenCalled();
  });

  it('aceita HTTPS alinhado à API pública', () => {
    const onFatal = vi.fn();
    const ok = assertPublicUploadBaseUrlForStaging({
      apiBase: 'https://api.staging.test',
      publicUploadBaseUrl: 'https://api.staging.test/uploads',
      error: () => {},
      onFatal,
    });
    expect(ok).toBe(true);
    expect(onFatal).not.toHaveBeenCalled();
  });

  it('docker-compose repassa PUBLIC_UPLOAD_BASE_URL ao serviço api', () => {
    const yml = readFileSync(resolve(repoRoot, 'docker-compose.yml'), 'utf8');
    expect(yml).toMatch(/PUBLIC_UPLOAD_BASE_URL:\s*\$\{PUBLIC_UPLOAD_BASE_URL/);
  });
});

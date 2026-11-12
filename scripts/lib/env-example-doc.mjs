import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

/** Chaves mínimas documentadas em .env.example (DOC-1). */
export const ENV_EXAMPLE_REQUIRED_KEYS = [
  'PELADA_WEB_URL',
  'PELADA_API_URL',
  'KEYCLOAK_ISSUER',
  'KEYCLOAK_JWKS_URI',
  'DATABASE_URL',
  'DATABASE_URL_TEST',
  'CORS_ORIGIN',
  'PUBLIC_UPLOAD_BASE_URL',
];

export function assertEnvExampleKeys(
  envPath = resolve(repoRoot, '.env.example'),
  keys = ENV_EXAMPLE_REQUIRED_KEYS,
) {
  const content = readFileSync(envPath, 'utf8');
  const missing = keys.filter((k) => !new RegExp(`^${k}=`, 'm').test(content));
  if (missing.length) {
    throw new Error(`.env.example sem chaves: ${missing.join(', ')}`);
  }
  return true;
}

export function readmeMentionsEnvExample(
  readmePath = resolve(repoRoot, 'README.md'),
) {
  const text = readFileSync(readmePath, 'utf8');
  if (!text.includes('.env.example')) {
    throw new Error('README.md deve referenciar .env.example (DOC-1)');
  }
  if (!text.includes('desenvolvimento-local.md')) {
    throw new Error('README.md deve linkar desenvolvimento-local.md');
  }
  return true;
}

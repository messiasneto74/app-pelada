import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { envFromDotenv } from './env-from-dotenv.mjs';

describe('envFromDotenv', () => {
  let dir;
  let envPath;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pelada-env-'));
    envPath = join(dir, '.env');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.KEYCLOAK_ADMIN;
  });

  it('prefers process.env', () => {
    process.env.KEYCLOAK_ADMIN = 'from-env';
    expect(envFromDotenv('KEYCLOAK_ADMIN', 'fb', envPath)).toBe('from-env');
  });

  it('reads from file', () => {
    writeFileSync(envPath, 'KEYCLOAK_ADMIN=from-file\n');
    expect(envFromDotenv('KEYCLOAK_ADMIN', 'fb', envPath)).toBe('from-file');
  });

  it('strips quotes', () => {
    writeFileSync(envPath, 'KEYCLOAK_ADMIN_PASSWORD="quoted"\n');
    expect(envFromDotenv('KEYCLOAK_ADMIN_PASSWORD', 'fb', envPath)).toBe('quoted');
  });

  it('returns fallback when missing', () => {
    expect(envFromDotenv('MISSING', 'fb', envPath)).toBe('fb');
  });
});

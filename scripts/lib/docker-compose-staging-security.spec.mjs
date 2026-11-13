import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

describe('docker-compose.yml segurança de staging (A5)', () => {
  const yml = readFileSync(resolve(repoRoot, 'docker-compose.yml'), 'utf8');

  it('não expõe Postgres (app, test, keycloak) em 0.0.0.0', () => {
    const postgresPortLines = yml
      .split('\n')
      .filter((line) => /POSTGRES_(APP|APP_TEST|KEYCLOAK)_PORT/.test(line));

    expect(postgresPortLines.length).toBeGreaterThan(0);
    for (const line of postgresPortLines) {
      expect(line).toMatch(/"127\.0\.0\.1:\$\{POSTGRES_/);
    }
  });

  it('persiste os uploads da API em um volume (não some após redeploy)', () => {
    const apiServiceMatch = yml.match(/ {2}api:\n([\s\S]*?)\nvolumes:\n/);
    expect(apiServiceMatch).toBeTruthy();
    expect(apiServiceMatch?.[1]).toMatch(/pelada_uploads:\/app\/uploads/);
    expect(yml).toMatch(/^\s*pelada_uploads:\s*$/m);
  });
});

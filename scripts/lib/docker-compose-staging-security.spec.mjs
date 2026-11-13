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

  it('repassa KEYCLOAK_CLIENT_ID ao container da API (achado de segurança do Codex no PR #128: sem isso, a restrição de client no JWT — Médio M2 — fica sempre desativada em produção)', () => {
    const apiServiceMatch = yml.match(/ {2}api:\n([\s\S]*?)\nvolumes:\n/);
    expect(apiServiceMatch).toBeTruthy();
    expect(apiServiceMatch?.[1]).toMatch(
      /KEYCLOAK_CLIENT_ID:\s*\$\{KEYCLOAK_CLIENT_ID/,
    );
  });
});

describe('docker-compose.staging.yml habilita TRUST_PROXY só no overlay de staging (achado de segurança do Codex no PR #129)', () => {
  const stagingYml = readFileSync(
    resolve(repoRoot, 'docker-compose.staging.yml'),
    'utf8',
  );
  const baseYml = readFileSync(resolve(repoRoot, 'docker-compose.yml'), 'utf8');

  it('overlay de staging habilita TRUST_PROXY para o serviço api', () => {
    const apiOverlayMatch = stagingYml.match(/ {2}api:\n([\s\S]*?)(\n {2}\S|$)/);
    expect(apiOverlayMatch).toBeTruthy();
    expect(apiOverlayMatch?.[1]).toMatch(/TRUST_PROXY:\s*\$\{TRUST_PROXY:-true\}/);
  });

  it('docker-compose.yml base não habilita TRUST_PROXY (seguro por padrão fora de staging)', () => {
    const apiServiceMatch = baseYml.match(/ {2}api:\n([\s\S]*?)\nvolumes:\n/);
    expect(apiServiceMatch).toBeTruthy();
    expect(apiServiceMatch?.[1]).not.toMatch(/TRUST_PROXY/);
  });
});

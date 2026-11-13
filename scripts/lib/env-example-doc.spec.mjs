import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertEnvExampleKeys,
  ENV_EXAMPLE_REQUIRED_KEYS,
  readmeMentionsEnvExample,
} from './env-example-doc.mjs';

describe('env-example-doc', () => {
  it('.env.example contém chaves mínimas de dev', () => {
    expect(assertEnvExampleKeys()).toBe(true);
  });

  it('README referencia .env.example e guia local', () => {
    expect(readmeMentionsEnvExample()).toBe(true);
  });

  it('falha se README não citar .env.example', () => {
    const dir = mkdtempSync(join(tmpdir(), 'readme-'));
    const path = join(dir, 'README.md');
    writeFileSync(path, '# sem env\n');
    expect(() => readmeMentionsEnvExample(path)).toThrow(/\.env\.example/);
  });

  it('falha se faltar chave obrigatória', () => {
    const dir = mkdtempSync(join(tmpdir(), 'env-example-'));
    const path = join(dir, '.env.example');
    writeFileSync(path, 'PELADA_WEB_URL=http://localhost:4200\n');
    expect(() => assertEnvExampleKeys(path, ENV_EXAMPLE_REQUIRED_KEYS)).toThrow(
      /sem chaves/,
    );
  });
});

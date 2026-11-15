import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

describe('.github/workflows/review-policy.yml roda em qualquer review (achado P1 do Codex no PR #143)', () => {
  const yml = readFileSync(
    resolve(repoRoot, '.github/workflows/review-policy.yml'),
    'utf8',
  );

  it('o job review-policy não tem `if` filtrando pelo autor da review', () => {
    const jobBlock = yml.match(/\n {2}review-policy:\n([\s\S]*?)\n {4}name: review-policy/);
    expect(jobBlock).toBeTruthy();
    // Um job pulado por `if` reporta sucesso no check obrigatório mesmo sem
    // rodar — então o gate não pode depender de quem disparou a review.
    expect(jobBlock?.[1]).not.toMatch(/\n {4}if:/);
  });

  it('isola pull_request de pull_request_review só pelo concurrency.group (não por `if` de job)', () => {
    expect(yml).toMatch(
      /group:\s*review-policy-\$\{\{\s*github\.event\.pull_request\.number\s*\}\}-\$\{\{\s*github\.event_name\s*\}\}/,
    );
  });
});

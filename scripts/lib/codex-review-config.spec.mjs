import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

describe('.github/codex/config.toml permite o Codex alcançar o Postgres local de review (achado P1 do Codex no PR #143)', () => {
  const toml = readFileSync(
    resolve(repoRoot, '.github/codex/config.toml'),
    'utf8',
  );

  it('habilita allow_local_binding (localhost resolve para endereço privado)', () => {
    const profileBlock = toml.match(
      /\[permissions\.pelada-review\.network\]\n([\s\S]*?)\n\[/,
    );
    expect(profileBlock).toBeTruthy();
    expect(profileBlock?.[1]).toMatch(/allow_local_binding\s*=\s*true/);
  });

  it('permite localhost e 127.0.0.1 (RUN_DB_TESTS=1 aponta pro Postgres de serviço em localhost:5435)', () => {
    const domainsBlock = toml.match(
      /\[permissions\.pelada-review\.network\.domains\]\n([\s\S]*)$/,
    );
    expect(domainsBlock).toBeTruthy();
    expect(domainsBlock?.[1]).toMatch(/"localhost"\s*=\s*"allow"/);
    expect(domainsBlock?.[1]).toMatch(/"127\.0\.0\.1"\s*=\s*"allow"/);
  });
});

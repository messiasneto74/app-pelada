/**
 * R-07 local: cobertura ≥80% nas linhas alteradas do PR vs main (mesma ideia da automação).
 * Uso: node scripts/check-pr-line-coverage.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const MIN = 80;
const base = process.env.COVERAGE_BASE_REF ?? 'origin/main';

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf8' }).trim();
}

const files = git(`diff --name-only ${base}...HEAD`)
  .split(/\r?\n/)
  .filter((f) => f && /\.(mjs|ts|js)$/.test(f) && !f.endsWith('.spec.mjs'));

if (files.length === 0) {
  console.log('Nenhum arquivo executável no diff — OK');
  process.exit(0);
}

const covPath = 'coverage/coverage-final.json';
if (!existsSync(covPath)) {
  console.error('Rode npm run test:scripts:cov antes.');
  process.exit(1);
}

const map = JSON.parse(readFileSync(covPath, 'utf8'));
let hit = 0;
let total = 0;
const gaps = [];

for (const file of files) {
  const norm = file.replace(/\\/g, '/');
  const entryKey = Object.keys(map).find((k) => k.replace(/\\/g, '/').endsWith(norm));
  if (!entryKey) {
    gaps.push(`${file} (sem dados de cobertura)`);
    continue;
  }
  const data = map[entryKey];
  const statements = data.s ?? {};
  const statementMap = data.statementMap ?? {};
  for (const id of Object.keys(statements)) {
    total += 1;
    if (statements[id] > 0) hit += 1;
    else {
      const loc = statementMap[id];
      gaps.push(`${file}:${loc?.start?.line ?? '?'}`);
    }
  }
}

const pct = total ? (hit / total) * 100 : 100;
console.log(`R-07 diff: ${hit}/${total} linhas (${pct.toFixed(1)}%) — mínimo ${MIN}%`);

if (pct < MIN) {
  console.error('Linhas sem cobertura (amostra):');
  gaps.slice(0, 30).forEach((g) => console.error(`  - ${g}`));
  process.exit(1);
}

console.log('OK');

/**
 * Marca checkboxes do bloco Testes obrigatórios + Definition of Done na issue.
 * Uso (após merge + test:all verde): node scripts/mark-issue-dod.mjs 8
 *
 * Requer: gh auth login
 */

import { spawnSync } from 'node:child_process';
import { markCheckboxesInBody } from './lib/issue-dod.mjs';

const REPO = 'messiasneto74/app-pelada';

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `gh failed: ${args.join(' ')}`);
  }
  return r.stdout;
}

const numbers = process.argv.slice(2).map((n) => Number(n)).filter(Boolean);
if (numbers.length === 0) {
  console.error('Uso: node scripts/mark-issue-dod.mjs <issue-number> [issue-number...]');
  process.exit(1);
}

for (const num of numbers) {
  const json = gh([
    'issue',
    'view',
    String(num),
    '--repo',
    REPO,
    '--json',
    'body,title',
  ]);
  const { body, title } = JSON.parse(json);
  const updated = markCheckboxesInBody(body);
  if (updated === body) {
    console.warn(`#${num} — nenhum checkbox para marcar (${title})`);
    continue;
  }
  const tmp = spawnSync(
    'gh',
    ['issue', 'edit', String(num), '--repo', REPO, '--body', updated],
    { encoding: 'utf8' },
  );
  if (tmp.status !== 0) {
    throw new Error(tmp.stderr || tmp.stdout);
  }
  console.log(`#${num} — checkboxes DoD marcados (${title})`);
}

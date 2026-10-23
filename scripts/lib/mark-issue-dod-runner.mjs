import { markCheckboxesInBody } from './issue-dod.mjs';

export const DEFAULT_REPO = 'messiasneto74/app-pelada';

/** Marca checkboxes DoD nas issues (gh injetável para testes). */
export function markIssuesDod(numbers, deps = {}) {
  const {
    repo = DEFAULT_REPO,
    gh,
    warn = console.warn,
    log = console.log,
  } = deps;

  if (!gh) {
    throw new Error('gh dependency required');
  }

  const results = [];
  for (const num of numbers) {
    const json = gh([
      'issue',
      'view',
      String(num),
      '--repo',
      repo,
      '--json',
      'body,title',
    ]);
    const { body, title } = JSON.parse(json);
    const updated = markCheckboxesInBody(body);
    if (updated === body) {
      warn(`#${num} — nenhum checkbox para marcar (${title})`);
      results.push({ num, changed: false });
      continue;
    }
    gh(['issue', 'edit', String(num), '--repo', repo, '--body', updated]);
    log(`#${num} — checkboxes DoD marcados (${title})`);
    results.push({ num, changed: true });
  }
  return results;
}

export function parseIssueNumbers(argv) {
  return argv.map((n) => Number(n)).filter(Boolean);
}

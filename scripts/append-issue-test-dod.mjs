/**
 * Acrescenta "## Testes obrigatórios" nas issues do GitHub se ainda não existir.
 * Uso: node append-issue-test-dod.mjs
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const REPO = 'messiasneto74/app-pelada';
const MARKER = '## Testes obrigatórios';

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout;
}

const issues = JSON.parse(
  gh(['issue', 'list', '--repo', REPO, '--state', 'open', '--limit', '100', '--json', 'number,title,body,labels']),
);

function blockForIssue(issue) {
  const labels = issue.labels.map((l) => l.name);
  const id = issue.title.split(':')[0].trim();
  const parts = [];

  if (labels.includes('core') || id.startsWith('CORE-') || id === 'L45-CORE') {
    parts.push(`### Core (\`${id}\`)
- [ ] Vitest em \`packages/core\` — ver [estrategia-testes.md §A](https://github.com/${REPO}/blob/main/docs/estrategia-testes.md)
- [ ] \`npm run test:core\` verde no CI`);
  }
  if (labels.includes('backend') || id.endsWith('-API') || /^F0-/.test(id) || id === 'T5') {
    const apiMin = {
      'F0-3': 3,
      'F0-4b': 7,
      'L1-API': 4,
      '3.2-API': 6,
      '3.2-EXC': 2,
      '3.1-API': 3,
      '3.7-API': 6,
      '3.3-API': 3,
      '3.4-API': 8,
      '5-API': 6,
      '3.6-API': 5,
      '3.9-API': 6,
    }[id];
    const minLine = apiMin ? `- [ ] Mín. **${apiMin}** casos integração (tabela §B do doc)` : '- [ ] Casos integração conforme §B';
    parts.push(`### API (\`${id}\`)
- [ ] Supertest + Postgres teste (\`TEST-API-HARNESS\`)
${minLine}
- [ ] \`npm run test:api\` verde no CI
- [ ] Migration Prisma se schema mudou`);
  }
  if (labels.includes('frontend') || /^3\.|^L\d|^T[1-6]/.test(id) || id === 'F0-5' || id === 'F0-6') {
    parts.push(`### Frontend (\`${id}\`)
- [ ] Lógica: testes unitários (\`TEST-WEB-HARNESS\`) OU screenshot 390px + checklist spec §3 no PR
- [ ] Aceite manual dos critérios da tela`);
  }
  if (labels.includes('qa') || id === 'E2E-1') {
    parts.push(`### E2E (\`${id}\`)
- [ ] Playwright fluxo MVP + 2 smoke — [§D](https://github.com/${REPO}/blob/main/docs/estrategia-testes.md)
- [ ] Staging (\`DEPLOY-1\`) antes de fechar`);
  }
  if (labels.includes('devops') || id === 'CI-1' || id === 'DEPLOY-1' || id === 'F0-7') {
    parts.push(`### DevOps (\`${id}\`)
- [ ] ${id === 'CI-1' ? 'Workflow CI bloqueia PR se testes falharem' : 'Infra documentada + smoke pós-deploy'}`);
  }
  if (id === 'TEST-API-HARNESS' || id === 'TEST-WEB-HARNESS') {
    parts.push(`### Harness (\`${id}\`)
- [ ] Entregar runner + exemplos mínimos descritos na issue
- [ ] Desbloqueia DoD das demais issues`);
  }
  if (id === 'CORE-TEST') {
    parts.push(`### CORE-TEST
- [ ] Completar suites §A (meta 18–25 casos no MVP)`);
  }
  if (parts.length === 0) {
    parts.push(`- [ ] Ver [estrategia-testes.md](https://github.com/${REPO}/blob/main/docs/estrategia-testes.md) e matriz por label`);
  }

  return `${MARKER}

_Não fechar sem marcar itens feitos no PR. [Definition of Done](https://github.com/${REPO}/blob/main/docs/estrategia-testes.md)._

${parts.join('\n\n')}

## Definition of Done (issue)
- [ ] Critérios de aceite spec/plano
- [ ] Testes acima + CI verde (\`CI-1\`)
- [ ] PR referencia esta issue`;
}

let updated = 0;
let skipped = 0;

for (const issue of issues) {
  if (issue.body?.includes(MARKER)) {
    skipped++;
    continue;
  }
  const appendix = blockForIssue(issue);
  const newBody = `${issue.body?.trim() || ''}\n\n---\n\n${appendix}\n`;
  const tmp = mkdtempSync(join(tmpdir(), 'pelada-issue-edit-'));
  const bodyPath = join(tmp, `${issue.number}.md`);
  writeFileSync(bodyPath, newBody, 'utf8');
  gh(['issue', 'edit', String(issue.number), '--repo', REPO, '--body-file', bodyPath]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`#${issue.number} updated`);
  updated++;
}

console.log(`Done: ${updated} updated, ${skipped} already had block.`);

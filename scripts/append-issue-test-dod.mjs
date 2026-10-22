/**
 * Atualiza bloco "## Testes obrigatórios" nas issues (modo local, sem CI obrigatório).
 * Uso: node append-issue-test-dod.mjs
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const REPO = 'messiasneto74/app-pelada';
const MARKER = '## Testes obrigatórios';
const LOCAL_DOC = `https://github.com/${REPO}/blob/main/docs/desenvolvimento-local.md`;
const ESTRATEGIA = `https://github.com/${REPO}/blob/main/docs/estrategia-testes.md`;
const PROCESSO = `https://github.com/${REPO}/blob/main/docs/processo-testes-e-qualidade.md`;

const PROCESSO_BLOCK = `## Processo de testes (oficial)

| Quem | O quê |
|------|--------|
| **Você** | Antes de fechar esta issue: rodar na **sua máquina** os comandos em **Testes obrigatórios** abaixo (\`npm.cmd run test:core\` / \`test:api\` / \`test:web\` conforme o caso). |
| **Agente Cursor** | Se você pedir *implementar esta issue*: o agente escreve código + testes e **executa os mesmos comandos no seu PC** até passar — **apenas o escopo desta issue**, não as 58 de uma vez. |
| **CI (CI-1)** | Opcional / depois — **não** é obrigatório para fechar issues agora. |

Documentação: [processo-testes-e-qualidade.md](${PROCESSO}) · [desenvolvimento-local.md](${LOCAL_DOC})`;

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout;
}

const issues = JSON.parse(
  gh(['issue', 'list', '--repo', REPO, '--state', 'open', '--limit', '100', '--json', 'number,title,body,labels']),
);

function stripTestAppendix(body) {
  if (!body) return '';
  const reProc = /\r?\n---\r?\n\r?\n## Processo de testes[\s\S]*$/i;
  if (reProc.test(body)) return body.replace(reProc, '').trim();
  const re = /\r?\n---\r?\n\r?\n## Testes obrigat[\s\S]*$/i;
  if (re.test(body)) return body.replace(re, '').trim();
  const idx = body.search(/## Testes obrigat/i);
  if (idx >= 0) {
    const sep = body.lastIndexOf('---', idx);
    if (sep >= 0 && idx - sep < 15) return body.slice(0, sep).trim();
    return body.slice(0, idx).trim();
  }
  return body.trim();
}

function blockForIssue(issue) {
  const labels = issue.labels.map((l) => l.name);
  const id = issue.title.split(':')[0].trim();
  const parts = [];

  if (id === 'LOCAL-DEV-1') {
    parts.push(`### Local (\`${id}\`)
- [ ] Conteúdo alinhado a [desenvolvimento-local.md](${LOCAL_DOC})
- [ ] Scripts \`test:core\`, \`test:api\`, \`test:web\` documentados no README`);
  } else if (id === 'CI-1' || labels.includes('depois')) {
    parts.push(`### CI (\`${id}\`) — **opcional / depois**
- [ ] Não bloqueia MVP local-first
- [ ] Quando fizer: workflow + mesmo comando que roda na máquina`);
  } else if (labels.includes('core') || id.startsWith('CORE-') || id === 'L45-CORE') {
    parts.push(`### Core (\`${id}\`)
- [ ] Vitest em \`packages/core\` — [estrategia-testes.md §A](${ESTRATEGIA})
- [ ] \`npm.cmd run test:core\` **verde na sua máquina**`);
  }

  const apiIssues = new Set([
    'F0-2', 'F0-3', 'F0-4b', 'T5', 'STORAGE-1',
    'L1-API', '3.2-API', '3.2-EXC', '3.1-API', '3.7-API', '3.3-API', '3.4-API', '5-API', '3.6-API', '3.9-API',
  ]);
  if (apiIssues.has(id) || (labels.includes('backend') && id.endsWith('-API'))) {
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
      'STORAGE-1': 3,
    }[id];
    const minLine = apiMin ? `- [ ] Mín. **${apiMin}** casos integração (§B)` : '- [ ] Casos integração conforme §B';
    parts.push(`### API (\`${id}\`)
- [ ] Supertest + Postgres teste local (\`TEST-API-HARNESS\` / Docker)
${minLine}
- [ ] \`npm.cmd run test:api\` **verde na sua máquina**
- [ ] Migration Prisma se schema mudou`);
  }

  if (id === 'F0-1') {
    parts.push(`### Monorepo (\`${id}\`)
- [ ] Scripts \`test:core\`, \`test:api\`, \`dev:web\`, \`dev:api\` na raiz
- [ ] \`npm.cmd install\` + \`npm.cmd run test:core\` passam localmente (quando core existir)`);
  }

  if (labels.includes('frontend') || /^3\.|^L\d|^T[1-6]/.test(id) || id === 'F0-5' || id === 'F0-6') {
    if (!['F0-1'].includes(id)) {
      parts.push(`### Frontend (\`${id}\`)
- [ ] Lógica: testes unitários (\`TEST-WEB-HARNESS\`) **local**
- [ ] Só UI: checklist spec §3 + screenshot 390px no PR
- [ ] Aceite manual na sua máquina (\`ng serve\`)`);
    }
  }

  if (labels.includes('qa') || id === 'E2E-1') {
    parts.push(`### E2E (\`${id}\`)
- [ ] Playwright — fluxo MVP §D + 2 smoke
- [ ] Rodar **local** (Docker + \`npx playwright test\`); staging opcional depois`);
  }

  if (['F0-4', 'F0-7', 'DEPLOY-1', 'STORE-1'].includes(id) || (labels.includes('devops') && id !== 'CI-1')) {
    parts.push(`### DevOps (\`${id}\`)
- [ ] \`docker compose\` sobe na sua máquina (doc em desenvolvimento-local)
- [ ] Smoke manual: health API + login Keycloak (quando aplicável)`);
  }

  if (id === 'TEST-API-HARNESS' || id === 'TEST-WEB-HARNESS') {
    parts.push(`### Harness (\`${id}\`)
- [ ] Runner configurado; exemplos mínimos passam **local**
- [ ] Desbloqueia DoD das demais issues`);
  }
  if (id === 'CORE-TEST') {
    parts.push(`### CORE-TEST
- [ ] Suites §A completas (meta 18–25 casos); \`test:core\` local`);
  }
  if (id === 'DOC-1' || id === 'A11Y-1') {
    parts.push(`### Docs / A11y (\`${id}\`)
- [ ] Entregável conforme título; validado lendo/usando na máquina`);
  }

  if (parts.length === 0) {
    parts.push(`- [ ] Ver [estrategia-testes.md](${ESTRATEGIA}) e [desenvolvimento-local.md](${LOCAL_DOC})`);
  }

  return `${PROCESSO_BLOCK}

---

${MARKER}

_Testes rodam na **sua máquina** ([guia](${LOCAL_DOC})). CI (\`CI-1\`) é opcional depois._

${parts.join('\n\n')}

## Definition of Done (issue)
- [ ] Critérios de aceite spec/plano
- [ ] Testes acima executados **localmente** (comandos no PR)
- [ ] PR/commit referencia esta issue`;
}

let updated = 0;
let skipped = 0;

for (const issue of issues) {
  const base = stripTestAppendix(issue.body);
  const appendix = blockForIssue(issue);
  const newBody = `${base}\n\n---\n\n${appendix}\n`;

  const tmp = mkdtempSync(join(tmpdir(), 'pelada-issue-edit-'));
  const bodyPath = join(tmp, `${issue.number}.md`);
  writeFileSync(bodyPath, newBody, 'utf8');
  gh(['issue', 'edit', String(issue.number), '--repo', REPO, '--body-file', bodyPath]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`#${issue.number} updated`);
  updated++;
}

console.log(`Done: ${updated} updated, ${skipped} skipped.`);

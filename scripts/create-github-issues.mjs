import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = 'messiasneto74/app-pelada';
const PLAN_URL = `https://github.com/${REPO}/blob/main/docs/plano-issues-fases-milestones.md`;

const data = JSON.parse(readFileSync(join(__dirname, 'github-issues.json'), 'utf8'));

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout;
}

let milestoneTitles = [];
try {
  milestoneTitles = JSON.parse(run('gh', ['api', `repos/${REPO}/milestones`, '--jq', '[.[].title]']));
} catch {
  milestoneTitles = [];
}

for (const m of data.milestones) {
  if (milestoneTitles.includes(m.title)) {
    console.log(`Milestone exists: ${m.title}`);
    continue;
  }
  run('gh', [
    'api',
    `repos/${REPO}/milestones`,
    '-f',
    `title=${m.title}`,
    '-f',
    `description=${m.description}`,
    '-f',
    'state=open',
  ]);
  console.log(`Milestone: ${m.title}`);
}

for (const l of data.labels) {
  spawnSync(
    'gh',
    [
      'label',
      'create',
      l.name,
      '--repo',
      REPO,
      '--color',
      l.color,
      '--description',
      l.description,
      '--force',
    ],
    { stdio: 'ignore' },
  );
}
console.log('Labels OK');

const existingTitles = JSON.parse(
  run('gh', ['issue', 'list', '--repo', REPO, '--state', 'all', '--limit', '200', '--json', 'title']),
).map((row) => row.title);

const tmp = mkdtempSync(join(tmpdir(), 'pelada-issues-'));

for (const i of data.issues) {
  const title = `${i.id}: ${i.title}`;
  if (existingTitles.some((t) => t.startsWith(`${i.id}:`))) {
    console.log(`Skip (exists): ${i.id}`);
    continue;
  }
  const body = `## Plano
**${i.id}** · Fase **${i.fase}**

## Depende (plano)
${i.depends}

## Histórias / spec
${i.stories}

## Documentação
- [${i.id} no plano](${PLAN_URL})

## Critérios de aceite
Conforme tabela no plano + spec de telas MVP e histórias no repositório.

## Testes obrigatórios
Rodar na **sua máquina**: [desenvolvimento-local.md](https://github.com/${REPO}/blob/main/docs/desenvolvimento-local.md). Ver [estrategia-testes.md](https://github.com/${REPO}/blob/main/docs/estrategia-testes.md). CI (\`CI-1\`) opcional depois.

## Definition of Done
- [ ] Aceite spec/plano
- [ ] Testes locais + comandos no PR
- [ ] PR referencia a issue
`;
  const bodyPath = join(tmp, `${i.id.replace(/[^a-zA-Z0-9-]/g, '_')}.md`);
  writeFileSync(bodyPath, body, 'utf8');
  run('gh', [
    'issue',
    'create',
    '--repo',
    REPO,
    '--title',
    title,
    '--body-file',
    bodyPath,
    '--label',
    i.labels.join(','),
    '--milestone',
    i.milestone,
  ]);
  console.log(`Issue: ${i.id}`);
}

rmSync(tmp, { recursive: true, force: true });
console.log(`Done: ${data.issues.length} issues.`);

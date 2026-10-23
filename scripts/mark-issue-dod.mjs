import {
  DEFAULT_REPO,
  markIssuesDod,
  parseIssueNumbers,
} from './lib/mark-issue-dod-runner.mjs';
import { spawnSync } from 'node:child_process';

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `gh failed: ${args.join(' ')}`);
  }
  return r.stdout;
}

const numbers = parseIssueNumbers(process.argv.slice(2));
if (numbers.length === 0) {
  console.error('Uso: node scripts/mark-issue-dod.mjs <issue-number> [issue-number...]');
  process.exit(1);
}

markIssuesDod(numbers, { repo: DEFAULT_REPO, gh });

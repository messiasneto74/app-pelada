import { readFile } from 'node:fs/promises';
import { evaluateCodexReview } from './lib/codex-review-policy.mjs';

try {
  const file = process.env.CODEX_REVIEW_FILE ?? 'codex-output.md';
  const headSha = process.env.HEAD_SHA;
  if (!headSha) throw new Error('HEAD_SHA ausente.');

  const body = await readFile(file, 'utf8');
  const result = evaluateCodexReview({
    body,
    headSha,
    frontendChanged: process.env.FRONTEND_CHANGED === 'true',
  });

  if (!result.allowed) {
    console.error(`::error title=Codex review policy::${result.message}`);
    process.exitCode = 1;
  } else {
    console.log(`::notice title=Codex review policy::${result.message}`);
  }
} catch (error) {
  console.error(`::error title=Codex review policy::${error.message}`);
  process.exitCode = 1;
}

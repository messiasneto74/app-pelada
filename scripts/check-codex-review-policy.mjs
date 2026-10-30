import { realpath, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluateCodexReview } from './lib/codex-review-policy.mjs';

try {
  const file = process.env.CODEX_REVIEW_FILE ?? 'codex-output.md';
  const headSha = process.env.HEAD_SHA;
  const expectedIssueNumber = Number(process.env.EXPECTED_ISSUE_NUMBER);
  const expectedMilestone = process.env.EXPECTED_MILESTONE;
  const frontendChanged = process.env.FRONTEND_CHANGED === 'true';
  if (!headSha) throw new Error('HEAD_SHA ausente.');
  if (!Number.isInteger(expectedIssueNumber)) {
    throw new Error('EXPECTED_ISSUE_NUMBER ausente ou inválido.');
  }
  if (!expectedMilestone) throw new Error('EXPECTED_MILESTONE ausente.');

  const body = await readFile(file, 'utf8');
  const result = evaluateCodexReview({
    body,
    headSha,
    frontendChanged,
    expectedIssueNumber,
    expectedMilestone,
  });

  if (!result.allowed) {
    console.error(`::error title=Codex review policy::${result.message}`);
    process.exitCode = 1;
  } else if (frontendChanged) {
    const artifactRoot = await realpath(
      path.resolve(process.env.CODEX_ARTIFACT_DIR ?? 'codex-artifacts'),
    );
    const evidencePath = await realpath(path.resolve(result.evidencePath));
    if (!evidencePath.startsWith(`${artifactRoot}${path.sep}`)) {
      throw new Error(
        'Evidência visual precisa estar dentro de codex-artifacts/.',
      );
    }
    const evidence = await stat(evidencePath);
    if (!evidence.isFile()) throw new Error('Evidência visual não é um arquivo.');
    console.log(`::notice title=Codex review policy::${result.message}`);
  } else {
    console.log(`::notice title=Codex review policy::${result.message}`);
  }
} catch (error) {
  console.error(`::error title=Codex review policy::${error.message}`);
  process.exitCode = 1;
}

import { describe, expect, it } from 'vitest';
import {
  evaluateCodexReview,
  REQUIRED_COMMANDS,
} from './codex-review-policy.mjs';

const headSha = 'abc1234abc1234abc1234abc1234abc1234abc12';

function readyReview(overrides = {}) {
  return [
    '## VEREDITO CODEX: APTO PARA APROVAÇÃO MANUAL',
    `Issue: ${overrides.issue ?? '#86 — Revisão Codex'}`,
    `Milestone: ${overrides.milestone ?? 'M0: Fundação'}`,
    `SHA revisado: \`${overrides.sha ?? headSha}\``,
    `Bloqueantes: ${overrides.blockers ?? 'B0=0, B1=0, B2=0'}`,
    `Testes executados: ${overrides.tests ?? REQUIRED_COMMANDS.join('; ')}`,
    `Resultado dos testes: ${overrides.result ?? 'PASSOU'}`,
    `Validação funcional de telas: ${overrides.ui ?? 'N/A'}`,
    `Viewport 390x844: ${overrides.viewport ?? 'N/A'}`,
    `Evidência visual: ${overrides.evidence ?? 'N/A'}`,
    overrides.extra ?? '',
  ].join('\n');
}

function evaluate(body, frontendChanged = false) {
  return evaluateCodexReview({
    body,
    headSha,
    frontendChanged,
    expectedIssueNumber: 86,
    expectedMilestone: 'M0: Fundação',
  });
}

describe('Codex review policy', () => {
  it('allows a complete backend-only ready verdict', () => {
    expect(evaluate(readyReview())).toMatchObject({
      allowed: true,
      code: 'ready_for_manual_approval',
    });
  });

  it('blocks an explicit rejection', () => {
    expect(
      evaluate('## VEREDITO CODEX: REQUEST_CHANGES — REPROVADO'),
    ).toMatchObject({
      allowed: false,
      code: 'changes_requested',
    });
  });

  it('requires the exact verdict first and a unique full current SHA', () => {
    expect(evaluate(`observação\n${readyReview()}`)).toMatchObject({
      allowed: false,
      code: 'unrecognized_verdict',
    });
    expect(
      evaluate(`${readyReview()}\n## VEREDITO CODEX: APTO PARA APROVAÇÃO MANUAL`),
    ).toMatchObject({ allowed: false, code: 'duplicate_verdict' });
    expect(evaluate(readyReview({ sha: headSha.slice(0, 10) }))).toMatchObject({
      allowed: false,
      code: 'review_sha_mismatch',
    });
    expect(
      evaluate(`${readyReview()}\nSHA revisado: \`${headSha}\``),
    ).toMatchObject({ allowed: false, code: 'review_sha_mismatch' });
  });

  it('matches issue and milestone exactly against trusted context', () => {
    for (const body of [
      readyReview({ issue: '#999 — Errada' }),
      readyReview({ milestone: 'Inventada' }),
      readyReview({ milestone: '' }),
    ]) {
      expect(evaluate(body)).toMatchObject({
        allowed: false,
        code: 'scope_mismatch',
      });
    }
  });

  it('blocks duplicate or malformed blocker declarations', () => {
    expect(
      evaluate(`${readyReview()}\nBloqueantes: B0=0, B1=1, B2=0`),
    ).toMatchObject({ allowed: false, code: 'missing_blocker_evidence' });
    expect(evaluate(readyReview({ blockers: '' }))).toMatchObject({
      allowed: false,
      code: 'missing_blocker_evidence',
    });
  });

  it('blocks blockers, failures, runtime skips and APPROVED', () => {
    for (const body of [
      readyReview({ blockers: 'B0=0, B1=0, B2=1' }),
      readyReview({ extra: 'audit FALHOU' }),
      readyReview({ extra: 'Test Suites: 2 skipped, 8 passed' }),
      readyReview({ extra: 'APPROVED' }),
    ]) {
      expect(evaluate(body)).toMatchObject({
        allowed: false,
        code: 'contradictory_ready_verdict',
      });
    }
  });

  it('requires every command, a non-empty field and one passing result', () => {
    expect(evaluate(readyReview({ tests: 'echo ok' }))).toMatchObject({
      allowed: false,
      code: 'missing_test_evidence',
    });
    expect(evaluate(readyReview({ tests: '' }))).toMatchObject({
      allowed: false,
      code: 'missing_or_duplicate_evidence',
    });
    expect(
      evaluate(`${readyReview()}\nResultado dos testes: PASSOU`),
    ).toMatchObject({ allowed: false, code: 'missing_or_duplicate_evidence' });
  });

  it('requires functional, viewport and visual evidence for frontend changes', () => {
    expect(evaluate(readyReview(), true)).toMatchObject({
      allowed: false,
      code: 'missing_ui_evidence',
    });

    expect(
      evaluate(
        readyReview({
          ui: 'PASSOU',
          viewport: 'PASSOU',
          evidence: 'codex-artifacts/tela-390x844.png',
        }),
        true,
      ),
    ).toMatchObject({
      allowed: true,
      code: 'ready_for_manual_approval',
      evidencePath: 'codex-artifacts/tela-390x844.png',
    });
  });
});

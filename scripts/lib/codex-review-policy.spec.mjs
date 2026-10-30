import { describe, expect, it } from 'vitest';
import { evaluateCodexReview } from './codex-review-policy.mjs';

const headSha = 'abc1234abc1234abc1234abc1234abc1234abc12';

function readyReview(overrides = {}) {
  return [
    '## VEREDITO CODEX: APTO PARA APROVAÇÃO MANUAL',
    'Issue: #86 — Revisão Codex',
    'Milestone: M0: Fundação',
    `SHA revisado: \`${headSha}\``,
    'Bloqueantes: B0=0, B1=0, B2=0',
    'Testes executados: npm run test:all:ci; npm run build:web; npm audit',
    'Resultado dos testes: PASSOU',
    `Validação funcional de telas: ${overrides.ui ?? 'N/A'}`,
    `Viewport 390x844: ${overrides.viewport ?? 'N/A'}`,
    `Evidência visual: ${overrides.evidence ?? 'N/A'}`,
    overrides.extra ?? '',
  ].join('\n');
}

describe('Codex review policy', () => {
  it('allows a complete backend-only ready verdict', () => {
    expect(
      evaluateCodexReview({
        body: readyReview(),
        headSha,
        frontendChanged: false,
      }),
    ).toMatchObject({ allowed: true, code: 'ready_for_manual_approval' });
  });

  it('blocks an explicit rejection', () => {
    expect(
      evaluateCodexReview({
        body: '## VEREDITO CODEX: REQUEST_CHANGES — REPROVADO',
        headSha,
        frontendChanged: false,
      }),
    ).toMatchObject({ allowed: false, code: 'changes_requested' });
  });

  it('blocks unknown verdicts and a stale or abbreviated SHA', () => {
    expect(
      evaluateCodexReview({ body: 'parece bom', headSha, frontendChanged: false }),
    ).toMatchObject({ allowed: false, code: 'unrecognized_verdict' });

    expect(
      evaluateCodexReview({
        body: readyReview().replace(headSha, headSha.slice(0, 10)),
        headSha,
        frontendChanged: false,
      }),
    ).toMatchObject({ allowed: false, code: 'review_sha_mismatch' });
  });

  it('blocks ready verdicts with blockers, failures or runtime skips', () => {
    for (const body of [
      readyReview().replace('B2=0', 'B2=1'),
      readyReview({ extra: 'audit FALHOU' }),
      readyReview({ extra: 'Test Suites: 2 skipped, 8 passed' }),
      readyReview({ extra: 'APPROVED' }),
    ]) {
      expect(
        evaluateCodexReview({ body, headSha, frontendChanged: false }),
      ).toMatchObject({ allowed: false, code: 'contradictory_ready_verdict' });
    }
  });

  it('requires issue, milestone, blockers and passing test evidence', () => {
    expect(
      evaluateCodexReview({
        body: readyReview().replace('Issue: #86 — Revisão Codex\n', ''),
        headSha,
        frontendChanged: false,
      }),
    ).toMatchObject({ allowed: false, code: 'missing_scope_evidence' });

    expect(
      evaluateCodexReview({
        body: readyReview().replace('Bloqueantes: B0=0, B1=0, B2=0\n', ''),
        headSha,
        frontendChanged: false,
      }),
    ).toMatchObject({ allowed: false, code: 'missing_blocker_evidence' });

    expect(
      evaluateCodexReview({
        body: readyReview().replace(
          'Resultado dos testes: PASSOU',
          'Resultado dos testes: N/A',
        ),
        headSha,
        frontendChanged: false,
      }),
    ).toMatchObject({ allowed: false, code: 'missing_test_evidence' });
  });

  it('requires functional, viewport and visual evidence for frontend changes', () => {
    expect(
      evaluateCodexReview({
        body: readyReview(),
        headSha,
        frontendChanged: true,
      }),
    ).toMatchObject({ allowed: false, code: 'missing_ui_evidence' });

    expect(
      evaluateCodexReview({
        body: readyReview({
          ui: 'PASSOU',
          viewport: 'PASSOU',
          evidence: 'codex-artifacts/tela-390x844.png',
        }),
        headSha,
        frontendChanged: true,
      }),
    ).toMatchObject({ allowed: true, code: 'ready_for_manual_approval' });
  });
});

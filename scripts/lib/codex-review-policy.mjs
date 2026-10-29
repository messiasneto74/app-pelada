const REJECTED_VERDICT =
  /^#{1,6}\s*VEREDITO CODEX:\s*REQUEST_CHANGES\s*(?:—|-)\s*REPROVADO\s*$/im;
const READY_VERDICT =
  /^#{1,6}\s*VEREDITO CODEX:\s*APTO PARA APROVAÇÃO MANUAL\s*$/im;
const REVIEWED_SHA = /^\s*SHA revisado:\s*`?([0-9a-f]{40})`?\s*$/im;
const ISSUE = /^\s*Issue:\s*#\d+\b.*$/im;
const MILESTONE = /^\s*Milestone:\s*(?!N\/?A\s*$)\S.*$/im;
const BLOCKERS =
  /^\s*Bloqueantes:\s*B0\s*=\s*(\d+)\s*,\s*B1\s*=\s*(\d+)\s*,\s*B2\s*=\s*(\d+)\s*$/im;
const TESTS_EXECUTED =
  /^\s*Testes executados:\s*(?!N\/?A\s*$|nenhum\s*$)\S.*$/im;
const TESTS_PASSED = /^\s*Resultado dos testes:\s*PASSOU\s*$/im;
const UI_PASSED = /^\s*Validação funcional de telas:\s*PASSOU\s*$/im;
const VIEWPORT_PASSED = /^\s*Viewport 390x844:\s*PASSOU\s*$/im;
const VISUAL_EVIDENCE =
  /^\s*Evidência visual:\s*(?!N\/?A\s*$|nenhuma\s*$)\S.*$/im;
const CONTRADICTION = /\b(?:FALHOU|REPROVADO|REQUEST_CHANGES|APPROVED)\b/i;
const RUNTIME_SKIPS =
  /\b[1-9]\d*\s+(?:(?:test suites?|tests?|su[ií]tes?|testes?)\s+)?(?:skipped|pulad[oa]s?|ignorad[oa]s?|pendentes?)\b/i;

export function evaluateCodexReview({ body = '', headSha, frontendChanged }) {
  if (REJECTED_VERDICT.test(body)) {
    return {
      allowed: false,
      code: 'changes_requested',
      message: 'O Codex reprovou o SHA atual.',
    };
  }

  if (!READY_VERDICT.test(body)) {
    return {
      allowed: false,
      code: 'unrecognized_verdict',
      message: 'A resposta do Codex não contém um veredito reconhecido.',
    };
  }

  const reviewedSha = body.match(REVIEWED_SHA)?.[1];
  if (!reviewedSha || reviewedSha.toLowerCase() !== headSha.toLowerCase()) {
    return {
      allowed: false,
      code: 'review_sha_mismatch',
      message: 'O parecer do Codex não confirma o SHA completo atual.',
    };
  }

  if (!ISSUE.test(body) || !MILESTONE.test(body)) {
    return {
      allowed: false,
      code: 'missing_scope_evidence',
      message: 'O parecer do Codex precisa identificar Issue e Milestone.',
    };
  }

  const blockerMatch = body.match(BLOCKERS);
  if (!blockerMatch) {
    return {
      allowed: false,
      code: 'missing_blocker_evidence',
      message: 'O parecer do Codex precisa declarar B0, B1 e B2.',
    };
  }

  const blockerCount = blockerMatch
    .slice(1)
    .reduce((total, value) => total + Number(value), 0);
  if (blockerCount > 0 || CONTRADICTION.test(body) || RUNTIME_SKIPS.test(body)) {
    return {
      allowed: false,
      code: 'contradictory_ready_verdict',
      message: 'O Codex declarou o PR apto, mas relatou falha, skip ou bloqueante.',
    };
  }

  if (!TESTS_EXECUTED.test(body) || !TESTS_PASSED.test(body)) {
    return {
      allowed: false,
      code: 'missing_test_evidence',
      message: 'O parecer apto não comprova comandos de teste executados e aprovados.',
    };
  }

  if (
    frontendChanged &&
    (!UI_PASSED.test(body) ||
      !VIEWPORT_PASSED.test(body) ||
      !VISUAL_EVIDENCE.test(body))
  ) {
    return {
      allowed: false,
      code: 'missing_ui_evidence',
      message: 'Frontend alterado sem validação funcional 390x844 e evidência visual.',
    };
  }

  return {
    allowed: true,
    code: 'ready_for_manual_approval',
    message: 'Parecer do Codex: apto para aprovação manual.',
  };
}

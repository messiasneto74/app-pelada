const READY = '## VEREDITO CODEX: APTO PARA APROVAÇÃO MANUAL';
const REJECTED = '## VEREDITO CODEX: REQUEST_CHANGES — REPROVADO';
const REQUIRED_COMMANDS = [
  'npm run test:no-skipped',
  'npm run test:all:ci',
  'npm run build:core',
  'npm run build:api',
  'npm run build:web',
  'npm audit --omit=dev --audit-level=high',
];
const CONTRADICTION = /\b(?:FALHOU|REPROVADO|REQUEST_CHANGES|APPROVED)\b/i;
const RUNTIME_SKIPS =
  /\b[1-9]\d*\s+(?:(?:test suites?|tests?|su[ií]tes?|testes?)\s+)?(?:skipped|pulad[oa]s?|ignorad[oa]s?|pendentes?)\b/i;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fieldValues(body, label) {
  const pattern = new RegExp(
    `^[ \\t]*${escapeRegex(label)}:[ \\t]*(.*?)[ \\t]*$`,
    'gim',
  );
  return [...body.matchAll(pattern)].map((match) => match[1].trim());
}

function uniqueField(body, label) {
  const values = fieldValues(body, label);
  return { valid: values.length === 1 && values[0] !== '', values };
}

function denied(code, message) {
  return { allowed: false, code, message };
}

export function evaluateCodexReview({
  body = '',
  headSha,
  frontendChanged,
  expectedIssueNumber,
  expectedMilestone,
}) {
  const firstLine = body
    .split(/\r?\n/)
    .find((line) => line.trim() !== '')
    ?.trim();
  if (firstLine === REJECTED) {
    return denied('changes_requested', 'O Codex reprovou o SHA atual.');
  }
  if (firstLine !== READY) {
    return denied(
      'unrecognized_verdict',
      'A primeira linha do Codex não contém o veredito apto reconhecido.',
    );
  }

  const readyCount = body
    .split(/\r?\n/)
    .filter((line) => line.trim() === READY).length;
  if (readyCount !== 1) {
    return denied('duplicate_verdict', 'O parecer contém veredito duplicado.');
  }

  const sha = uniqueField(body, 'SHA revisado');
  const normalizedSha = sha.values[0]?.replace(/^`|`$/g, '');
  if (
    !sha.valid ||
    !/^[0-9a-f]{40}$/i.test(normalizedSha) ||
    normalizedSha.toLowerCase() !== headSha.toLowerCase()
  ) {
    return denied(
      'review_sha_mismatch',
      'O parecer precisa conter uma única confirmação do SHA completo atual.',
    );
  }

  const issue = uniqueField(body, 'Issue');
  const milestone = uniqueField(body, 'Milestone');
  const issueNumber = Number(issue.values[0]?.match(/^#(\d+)\b/)?.[1]);
  if (
    !issue.valid ||
    !milestone.valid ||
    !Number.isInteger(expectedIssueNumber) ||
    issueNumber !== expectedIssueNumber ||
    milestone.values[0] !== expectedMilestone
  ) {
    return denied(
      'scope_mismatch',
      'Issue ou milestone do parecer diverge do contexto confiável do GitHub.',
    );
  }

  const blockers = uniqueField(body, 'Bloqueantes');
  const blockerMatch = blockers.values[0]?.match(
    /^B0\s*=\s*(\d+)\s*,\s*B1\s*=\s*(\d+)\s*,\s*B2\s*=\s*(\d+)$/i,
  );
  if (!blockers.valid || !blockerMatch) {
    return denied(
      'missing_blocker_evidence',
      'O parecer precisa declarar uma única linha válida de B0, B1 e B2.',
    );
  }

  const singleFields = [
    'Testes executados',
    'Resultado dos testes',
    'Validação funcional de telas',
    'Viewport 390x844',
    'Evidência visual',
  ].map((label) => [label, uniqueField(body, label)]);
  const invalidField = singleFields.find(([, field]) => !field.valid);
  if (invalidField) {
    return denied(
      'missing_or_duplicate_evidence',
      `Campo obrigatório ausente, vazio ou duplicado: ${invalidField[0]}.`,
    );
  }

  const blockerCount = blockerMatch
    .slice(1)
    .reduce((total, value) => total + Number(value), 0);
  if (blockerCount > 0 || CONTRADICTION.test(body) || RUNTIME_SKIPS.test(body)) {
    return denied(
      'contradictory_ready_verdict',
      'O Codex declarou o PR apto, mas relatou falha, skip ou bloqueante.',
    );
  }

  const testsExecuted = uniqueField(body, 'Testes executados').values[0]
    .replaceAll('`', ' ')
    .replace(/\s+/g, ' ');
  const missingCommand = REQUIRED_COMMANDS.find(
    (command) => !testsExecuted.includes(command),
  );
  const testsResult = uniqueField(body, 'Resultado dos testes').values[0];
  if (missingCommand || testsResult !== 'PASSOU') {
    return denied(
      'missing_test_evidence',
      missingCommand
        ? `Comando obrigatório não comprovado: ${missingCommand}.`
        : 'O resultado único dos testes não é PASSOU.',
    );
  }

  const ui = uniqueField(body, 'Validação funcional de telas').values[0];
  const viewport = uniqueField(body, 'Viewport 390x844').values[0];
  const evidence = uniqueField(body, 'Evidência visual').values[0]
    .replace(/^`|`$/g, '');
  if (
    frontendChanged &&
    (ui !== 'PASSOU' ||
      viewport !== 'PASSOU' ||
      /^(?:N\/?A|nenhuma)$/i.test(evidence))
  ) {
    return denied(
      'missing_ui_evidence',
      'Frontend alterado sem validação funcional 390x844 e evidência visual.',
    );
  }

  return {
    allowed: true,
    code: 'ready_for_manual_approval',
    message: 'Parecer do Codex: apto para aprovação manual.',
    evidencePath: frontendChanged ? evidence : null,
  };
}

export { REQUIRED_COMMANDS };

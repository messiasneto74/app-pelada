const DEFAULT_CURSOR_LOGINS = new Set(['cursor[bot]', 'cursor']);

const REJECTED_VERDICT =
  /^#{1,6}\s*VEREDITO:\s*REQUEST_CHANGES\s*(?:—|-)\s*REPROVADO\s*$/im;
const READY_VERDICT =
  /^#{1,6}\s*VEREDITO:\s*APTO PARA APROVAÇÃO MANUAL\s*$/im;
const REVIEWED_SHA = /^\s*SHA revisado:\s*`?([0-9a-f]{7,40})`?\s*$/im;
const ISSUE = /^\s*Issue:\s*#\d+\b.*$/im;
const MILESTONE = /^\s*Milestone:\s*\S.*$/im;
const BLOCKERS =
  /^\s*Bloqueantes:\s*B0\s*=\s*(\d+)\s*,\s*B1\s*=\s*(\d+)\s*,\s*B2\s*=\s*(\d+)\s*$/im;
const CONTRADICTORY_FAILURE = /\b(?:FALHOU|REPROVADO|REQUEST_CHANGES)\b/i;
const RUNTIME_SKIPS =
  /\b[1-9]\d*\s+(?:(?:test suites?|tests?|su[ií]tes?|testes?)\s+)?(?:skipped|pulad[oa]s?|ignorad[oa]s?|pendentes?)\b/i;

export function parseReviewVerdict(body = '') {
  if (REJECTED_VERDICT.test(body)) return 'rejected';
  if (READY_VERDICT.test(body)) return 'ready';
  return 'unknown';
}

function validateReadyEvidence(body, headSha) {
  const reviewedSha = body.match(REVIEWED_SHA)?.[1];
  if (!reviewedSha || reviewedSha.toLowerCase() !== headSha.toLowerCase()) {
    return {
      code: 'review_sha_mismatch',
      message: 'O parecer apto não confirma o SHA atual na linha "SHA revisado".',
    };
  }

  if (!ISSUE.test(body) || !MILESTONE.test(body)) {
    return {
      code: 'missing_scope_evidence',
      message: 'O parecer apto precisa identificar Issue e Milestone.',
    };
  }

  const blockerMatch = body.match(BLOCKERS);
  if (!blockerMatch) {
    return {
      code: 'missing_blocker_evidence',
      message: 'O parecer apto precisa declarar Bloqueantes: B0=0, B1=0, B2=0.',
    };
  }

  const blockerCount = blockerMatch.slice(1).reduce(
    (total, value) => total + Number(value),
    0,
  );
  if (
    blockerCount > 0 ||
    CONTRADICTORY_FAILURE.test(body) ||
    RUNTIME_SKIPS.test(body)
  ) {
    return {
      code: 'contradictory_ready_verdict',
      message: 'O parecer se declara apto, mas também contém reprovação, falha ou bloqueante.',
    };
  }

  return null;
}

function reviewTime(review) {
  const value = Date.parse(review.submitted_at ?? '');
  return Number.isNaN(value) ? 0 : value;
}

export function evaluateReviewPolicy({
  reviews,
  headSha,
  cursorLogins = DEFAULT_CURSOR_LOGINS,
}) {
  const candidates = reviews
    .filter((review) => cursorLogins.has(review.user?.login))
    .filter((review) => review.commit_id === headSha)
    .sort((left, right) => {
      const timeDifference = reviewTime(left) - reviewTime(right);
      return timeDifference || Number(left.id ?? 0) - Number(right.id ?? 0);
    });

  const review = candidates.at(-1);
  if (!review) {
    return {
      allowed: false,
      code: 'awaiting_cursor_review',
      message: 'Aguardando parecer do Cursor para o SHA atual.',
    };
  }

  const state = String(review.state ?? '').toUpperCase();
  const verdict = parseReviewVerdict(review.body);

  if (state === 'DISMISSED') {
    return {
      allowed: false,
      code: 'review_dismissed',
      message: 'O parecer mais recente do Cursor foi dispensado.',
      review,
    };
  }

  if (verdict === 'rejected' || state === 'CHANGES_REQUESTED') {
    return {
      allowed: false,
      code: 'changes_requested',
      message: 'O Cursor reprovou o SHA atual; correções e nova revisão são obrigatórias.',
      review,
    };
  }

  if (state === 'APPROVED') {
    return {
      allowed: false,
      code: 'agent_approved_forbidden',
      message: 'O agente não pode aprovar PR; aprovação e merge são manuais.',
      review,
    };
  }

  if (verdict === 'ready') {
    const evidenceError = validateReadyEvidence(review.body, headSha);
    if (evidenceError) {
      return {
        allowed: false,
        ...evidenceError,
        review,
      };
    }

    return {
      allowed: true,
      code: 'ready_for_manual_approval',
      message: 'Parecer do Cursor: apto para aprovação manual.',
      review,
    };
  }

  return {
    allowed: false,
    code: 'unrecognized_verdict',
    message: 'O parecer mais recente do Cursor não contém um veredito reconhecido.',
    review,
  };
}

export async function fetchPullRequestReviews({
  fetchFn,
  apiUrl,
  repository,
  pullRequestNumber,
  token,
}) {
  const reviews = [];

  for (let page = 1; ; page += 1) {
    const response = await fetchFn(
      `${apiUrl}/repos/${repository}/pulls/${pullRequestNumber}/reviews?per_page=100&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub reviews API respondeu ${response.status}.`);
    }

    const pageReviews = await response.json();
    reviews.push(...pageReviews);
    if (pageReviews.length < 100) break;
  }

  return reviews;
}

export async function runReviewPolicy({
  env = process.env,
  fetchFn = globalThis.fetch,
  log = console,
} = {}) {
  const required = ['GITHUB_TOKEN', 'GITHUB_REPOSITORY', 'PR_NUMBER', 'HEAD_SHA'];
  const missing = required.filter((name) => !env[name]);

  if (missing.length > 0) {
    return {
      exitCode: 1,
      result: {
        allowed: false,
        code: 'missing_environment',
        message: `Variáveis ausentes: ${missing.join(', ')}.`,
      },
    };
  }

  const reviews = await fetchPullRequestReviews({
    fetchFn,
    apiUrl: env.GITHUB_API_URL ?? 'https://api.github.com',
    repository: env.GITHUB_REPOSITORY,
    pullRequestNumber: env.PR_NUMBER,
    token: env.GITHUB_TOKEN,
  });
  const result = evaluateReviewPolicy({ reviews, headSha: env.HEAD_SHA });

  if (result.allowed) {
    log.log(`::notice title=Review policy::${result.message}`);
    return { exitCode: 0, result };
  }

  log.error(`::error title=Review policy::${result.message}`);
  return { exitCode: 1, result };
}

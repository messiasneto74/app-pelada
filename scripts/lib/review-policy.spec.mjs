import { describe, expect, it, vi } from 'vitest';
import {
  evaluateReviewPolicy,
  fetchPullRequestReviews,
  parseReviewVerdict,
  runReviewPolicy,
  waitForReviewPolicy,
} from './review-policy.mjs';

const headSha = 'abc1234abc1234abc1234abc1234abc1234abc12';

function cursorReview(overrides = {}) {
  return {
    id: 1,
    user: { login: 'cursor[bot]' },
    commit_id: headSha,
    state: 'COMMENTED',
    submitted_at: '2026-10-29T12:00:00Z',
    body: [
      '## VEREDITO: APTO PARA APROVAÇÃO MANUAL',
      'Issue: #17 — Tela Regras',
      'Milestone: M1 — Pelada configurada',
      `SHA revisado: \`${headSha}\``,
      'Bloqueantes: B0=0, B1=0, B2=0',
    ].join('\n'),
    ...overrides,
  };
}

describe('review policy verdict', () => {
  it('parses only the supported verdict headings', () => {
    expect(parseReviewVerdict('## VEREDITO: REQUEST_CHANGES — REPROVADO')).toBe(
      'rejected',
    );
    expect(parseReviewVerdict('## VEREDITO: APTO PARA APROVAÇÃO MANUAL')).toBe(
      'ready',
    );
    expect(parseReviewVerdict('Automation completed successfully')).toBe('unknown');
  });

  it('blocks while no Cursor review exists for the current SHA', () => {
    const result = evaluateReviewPolicy({
      reviews: [cursorReview({ commit_id: 'old-sha' })],
      headSha,
    });

    expect(result).toMatchObject({
      allowed: false,
      code: 'awaiting_cursor_review',
    });
  });

  it('blocks a rejected verdict even when GitHub stored it as COMMENTED', () => {
    const result = evaluateReviewPolicy({
      reviews: [
        cursorReview({ body: '## VEREDITO: REQUEST_CHANGES — REPROVADO' }),
      ],
      headSha,
    });

    expect(result).toMatchObject({ allowed: false, code: 'changes_requested' });
  });

  it('allows only the latest ready verdict for the current SHA', () => {
    const result = evaluateReviewPolicy({
      reviews: [
        cursorReview({
          id: 1,
          submitted_at: '2026-10-29T12:00:00Z',
          body: '## VEREDITO: REQUEST_CHANGES — REPROVADO',
        }),
        cursorReview({ id: 2, submitted_at: '2026-10-29T12:05:00Z' }),
      ],
      headSha,
    });

    expect(result).toMatchObject({
      allowed: true,
      code: 'ready_for_manual_approval',
    });
  });

  it('blocks agent approval and unknown or dismissed reviews', () => {
    expect(
      evaluateReviewPolicy({
        reviews: [cursorReview({ state: 'APPROVED' })],
        headSha,
      }),
    ).toMatchObject({ allowed: false, code: 'agent_approved_forbidden' });

    expect(
      evaluateReviewPolicy({
        reviews: [cursorReview({ state: 'DISMISSED' })],
        headSha,
      }),
    ).toMatchObject({ allowed: false, code: 'review_dismissed' });

    expect(
      evaluateReviewPolicy({
        reviews: [cursorReview({ body: 'sem veredito' })],
        headSha,
      }),
    ).toMatchObject({ allowed: false, code: 'unrecognized_verdict' });
  });

  it('blocks a ready heading with contradictory or incomplete evidence', () => {
    expect(
      evaluateReviewPolicy({
        reviews: [
          cursorReview({
            body: [
              '## VEREDITO: APTO PARA APROVAÇÃO MANUAL',
              'Issue: #17',
              'Milestone: M1',
              `SHA revisado: \`${headSha}\``,
              'Bloqueantes: B0=0, B1=1, B2=0',
            ].join('\n'),
          }),
        ],
        headSha,
      }),
    ).toMatchObject({ allowed: false, code: 'contradictory_ready_verdict' });

    expect(
      evaluateReviewPolicy({
        reviews: [cursorReview({ body: '## VEREDITO: APTO PARA APROVAÇÃO MANUAL' })],
        headSha,
      }),
    ).toMatchObject({ allowed: false, code: 'review_sha_mismatch' });

    expect(
      evaluateReviewPolicy({
        reviews: [
          cursorReview({
            body: [
              '## VEREDITO: APTO PARA APROVAÇÃO MANUAL',
              'Issue: #17',
              'Milestone: M1',
              'SHA revisado: `outro-sha`',
              'Bloqueantes: B0=0, B1=0, B2=0',
            ].join('\n'),
          }),
        ],
        headSha,
      }),
    ).toMatchObject({ allowed: false, code: 'review_sha_mismatch' });

    expect(
      evaluateReviewPolicy({
        reviews: [
          cursorReview({
            body: `${cursorReview().body}\nTest Suites: 2 skipped, 5 passed`,
          }),
        ],
        headSha,
      }),
    ).toMatchObject({ allowed: false, code: 'contradictory_ready_verdict' });
  });
});

describe('review policy GitHub integration', () => {
  it('paginates review responses', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: index }));
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => firstPage })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 100 }] });

    const reviews = await fetchPullRequestReviews({
      fetchFn,
      apiUrl: 'https://api.example.test',
      repository: 'owner/repo',
      pullRequestNumber: '10',
      token: 'token',
    });

    expect(reviews).toHaveLength(101);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('returns a failing exit code for missing environment', async () => {
    await expect(runReviewPolicy({ env: {} })).resolves.toMatchObject({
      exitCode: 1,
      result: { code: 'missing_environment' },
    });
  });

  it('uses exit code 2 only while waiting for the current SHA review', async () => {
    const log = { log: vi.fn(), error: vi.fn() };
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    const env = {
      GITHUB_TOKEN: 'token',
      GITHUB_REPOSITORY: 'owner/repo',
      PR_NUMBER: '10',
      HEAD_SHA: headSha,
      GITHUB_API_URL: 'https://api.example.test',
    };

    await expect(runReviewPolicy({ env, fetchFn, log })).resolves.toMatchObject({
      exitCode: 2,
      result: { code: 'awaiting_cursor_review' },
    });
  });

  it('returns the verdict as process outcome', async () => {
    const log = { log: vi.fn(), error: vi.fn() };
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [cursorReview()],
    });
    const env = {
      GITHUB_TOKEN: 'token',
      GITHUB_REPOSITORY: 'owner/repo',
      PR_NUMBER: '10',
      HEAD_SHA: headSha,
      GITHUB_API_URL: 'https://api.example.test',
    };

    await expect(runReviewPolicy({ env, fetchFn, log })).resolves.toMatchObject({
      exitCode: 0,
      result: { allowed: true },
    });
    expect(log.log).toHaveBeenCalledWith(
      expect.stringContaining('apto para aprovação manual'),
    );
  });
});

describe('review policy polling', () => {
  it('retries exit code 2 until the current SHA review is available', async () => {
    const runOnce = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 2 })
      .mockResolvedValueOnce({ exitCode: 2 })
      .mockResolvedValueOnce({ exitCode: 0, result: { allowed: true } });
    const sleepFn = vi.fn().mockResolvedValue(undefined);

    await expect(
      waitForReviewPolicy({ runOnce, sleepFn, attempts: 3, intervalMs: 10 }),
    ).resolves.toMatchObject({ exitCode: 0, result: { allowed: true } });
    expect(runOnce).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalledTimes(2);
  });

  it('stops immediately when the review rejects the SHA', async () => {
    const runOnce = vi.fn().mockResolvedValue({
      exitCode: 1,
      result: { allowed: false, code: 'changes_requested' },
    });
    const sleepFn = vi.fn();

    await expect(
      waitForReviewPolicy({ runOnce, sleepFn }),
    ).resolves.toMatchObject({
      exitCode: 1,
      result: { code: 'changes_requested' },
    });
    expect(runOnce).toHaveBeenCalledOnce();
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it('fails closed after exhausting the review wait timeout', async () => {
    const runOnce = vi.fn().mockResolvedValue({ exitCode: 2 });
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const log = { error: vi.fn() };

    await expect(
      waitForReviewPolicy({
        runOnce,
        sleepFn,
        log,
        attempts: 2,
        intervalMs: 10,
      }),
    ).resolves.toMatchObject({
      exitCode: 1,
      result: { code: 'cursor_review_timeout' },
    });
    expect(runOnce).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledOnce();
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Timeout'));
  });
});

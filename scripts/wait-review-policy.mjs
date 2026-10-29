import {
  runReviewPolicy,
  waitForReviewPolicy,
} from './lib/review-policy.mjs';

try {
  const { exitCode } = await waitForReviewPolicy({ runOnce: runReviewPolicy });
  process.exitCode = exitCode;
} catch (error) {
  console.error(`::error title=Review policy::${error.message}`);
  process.exitCode = 1;
}

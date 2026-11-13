import { runReviewPolicy } from './lib/review-policy.mjs';

try {
  const { exitCode } = await runReviewPolicy();
  process.exitCode = exitCode;
} catch (error) {
  console.error(`::error title=Review policy::${error.message}`);
  process.exitCode = 1;
}

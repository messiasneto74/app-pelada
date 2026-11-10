import { waitForE2eStack } from '../scripts/lib/e2e-stack-ready.mjs';

export default async function globalSetup(): Promise<void> {
  await waitForE2eStack({ checkWeb: true });
}

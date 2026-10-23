import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.spec.mjs'],
    coverage: {
      provider: 'v8',
      include: [
        'scripts/lib/**/*.mjs',
        'scripts/stack-smoke.mjs',
        'scripts/keycloak-smoke.mjs',
        'scripts/keycloak-reset.mjs',
        'scripts/mark-issue-dod.mjs',
      ],
      exclude: ['scripts/**/*.spec.mjs', 'scripts/lib/**/*.spec.mjs'],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 80,
        // Arrow helpers em defaults (fetchJson) não entram como função “executada” até teste dedicado.
        functions: 60,
      },
    },
  },
});

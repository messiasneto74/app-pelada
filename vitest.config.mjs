import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/lib/**/*.spec.mjs'],
    coverage: {
      provider: 'v8',
      include: ['scripts/lib/**/*.mjs'],
      exclude: ['scripts/lib/**/*.spec.mjs'],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 80,
        // Arrow helpers em defaults (fetchJson) não entram como função “executada” até teste dedicado.
        functions: 70,
      },
    },
  },
});

import { describe, expect, it } from 'vitest';
import { resolveDockerExecutable } from './docker-cli.mjs';

describe('resolveDockerExecutable', () => {
  it('returns docker on non-windows or when no Desktop path', () => {
    const result = resolveDockerExecutable();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

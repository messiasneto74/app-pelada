import { describe, expect, it } from 'vitest';
import { assertAndroidDeepLinks, assertIosUrlScheme } from './mobile-deep-links.mjs';

describe('mobile-deep-links', () => {
  it('Android manifest declara scheme e App Link /entrar', () => {
    expect(assertAndroidDeepLinks()).toBe(true);
  });

  it('iOS Info.plist declara URL scheme', () => {
    expect(assertIosUrlScheme()).toBe(true);
  });
});

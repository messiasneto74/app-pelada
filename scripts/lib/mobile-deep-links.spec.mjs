import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertAndroidDeepLinks, assertIosUrlScheme } from './mobile-deep-links.mjs';

describe('mobile-deep-links', () => {
  it('Android manifest declara scheme e App Link /entrar', () => {
    expect(assertAndroidDeepLinks()).toBe(true);
  });

  it('iOS Info.plist declara URL scheme', () => {
    expect(assertIosUrlScheme()).toBe(true);
  });

  it('rejeita Android sem scheme', () => {
    const dir = mkdtempSync(join(tmpdir(), 'manifest-'));
    const path = join(dir, 'AndroidManifest.xml');
    writeFileSync(path, '<manifest></manifest>');
    expect(() => assertAndroidDeepLinks(path)).toThrow(/scheme com.pelada.app/);
  });

  it('rejeita Android sem App Link /entrar', () => {
    const dir = mkdtempSync(join(tmpdir(), 'manifest-'));
    const path = join(dir, 'AndroidManifest.xml');
    writeFileSync(path, '<manifest scheme="com.pelada.app"></manifest>');
    expect(() => assertAndroidDeepLinks(path)).toThrow(/App Link \/entrar/);
  });

  it('rejeita iOS sem URL scheme', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plist-'));
    const path = join(dir, 'Info.plist');
    writeFileSync(path, '<plist></plist>');
    expect(() => assertIosUrlScheme(path)).toThrow(/URL scheme/);
  });
});

import { describe, expect, it } from 'vitest';
import {
  assertCapacitorWebDirMatchesAngular,
  CAPACITOR_WEB_DIR,
  readCapacitorWebDirFromConfig,
} from './capacitor-web-dir.mjs';

describe('capacitor-web-dir', () => {
  it('webDir aponta para dist do Angular application builder', () => {
    expect(readCapacitorWebDirFromConfig()).toBe(CAPACITOR_WEB_DIR);
    expect(assertCapacitorWebDirMatchesAngular()).toBe(CAPACITOR_WEB_DIR);
  });
});

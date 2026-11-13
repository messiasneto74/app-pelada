import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it('rejeita config sem webDir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cap-config-'));
    const path = join(dir, 'capacitor.config.ts');
    writeFileSync(path, 'export default { appId: "x" };');
    expect(() => readCapacitorWebDirFromConfig(path)).toThrow(/webDir não encontrado/);
  });

  it('rejeita webDir divergente do Angular', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cap-config-'));
    const path = join(dir, 'capacitor.config.ts');
    writeFileSync(path, "export default { webDir: 'wrong' };");
    expect(() => assertCapacitorWebDirMatchesAngular(path)).toThrow(/webDir Capacitor deve ser/);
  });
});

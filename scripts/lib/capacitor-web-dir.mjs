import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

/** Caminho webDir esperado pelo Capacitor (relativo a apps/pelada-mobile). */
export const CAPACITOR_WEB_DIR = '../pelada-web/dist/pelada-web/browser';

export function readCapacitorWebDirFromConfig(configPath = resolve(repoRoot, 'apps/pelada-mobile/capacitor.config.ts')) {
  const raw = readFileSync(configPath, 'utf8');
  const match = raw.match(/webDir:\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error(`webDir não encontrado em ${configPath}`);
  }
  return match[1];
}

export function assertCapacitorWebDirMatchesAngular() {
  const got = readCapacitorWebDirFromConfig();
  if (got !== CAPACITOR_WEB_DIR) {
    throw new Error(`webDir Capacitor deve ser ${CAPACITOR_WEB_DIR}, recebido ${got}`);
  }
  return got;
}

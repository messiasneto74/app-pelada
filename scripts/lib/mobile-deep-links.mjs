import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

export function assertAndroidDeepLinks(
  manifestPath = resolve(repoRoot, 'apps/pelada-mobile/android/app/src/main/AndroidManifest.xml'),
) {
  const xml = readFileSync(manifestPath, 'utf8');
  if (!xml.includes('scheme="com.pelada.app"')) {
    throw new Error('AndroidManifest: falta scheme com.pelada.app para OAuth');
  }
  if (!xml.includes('pathPrefix="/entrar"')) {
    throw new Error('AndroidManifest: falta https App Link /entrar');
  }
  return true;
}

export function assertIosUrlScheme(
  plistPath = resolve(repoRoot, 'apps/pelada-mobile/ios/App/App/Info.plist'),
) {
  const plist = readFileSync(plistPath, 'utf8');
  if (!plist.includes('com.pelada.app')) {
    throw new Error('Info.plist: falta URL scheme com.pelada.app');
  }
  return true;
}

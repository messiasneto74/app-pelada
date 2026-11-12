import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStagingWebEnvironmentSource,
  resolveStagingWebEnvFromProcess,
} from './lib/staging-web-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(
  root,
  'apps/pelada-web/src/environments/environment.staging.generated.ts',
);

const opts = resolveStagingWebEnvFromProcess(process.env);
const source = buildStagingWebEnvironmentSource(opts);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, source, 'utf8');
console.log(`Wrote ${outPath}`);

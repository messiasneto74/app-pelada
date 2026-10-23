import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runKeycloakSmoke } from './lib/run-keycloak-smoke.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
runKeycloakSmoke({ envPath: join(root, '.env') });

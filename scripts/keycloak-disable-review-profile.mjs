import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envFromDotenv } from './lib/env-from-dotenv.mjs';
import {
  disableReviewProfile,
  getAdminToken,
} from './lib/keycloak-review-profile.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

const baseUrl = envFromDotenv(
  'KEYCLOAK_URL',
  'http://localhost:8080',
  envPath,
).replace(/\/$/, '');
const realm = envFromDotenv('KEYCLOAK_REALM', 'pelada', envPath);
const adminUser = envFromDotenv('KEYCLOAK_ADMIN', 'admin', envPath);
const adminPass = envFromDotenv(
  'KEYCLOAK_ADMIN_PASSWORD',
  'keycloak_admin_dev',
  envPath,
);

try {
  const token = await getAdminToken({
    fetchFn: fetch,
    baseUrl,
    adminUser,
    adminPass,
  });
  const result = await disableReviewProfile({
    fetchFn: fetch,
    baseUrl,
    realm,
    token,
    log: console.log,
  });
  console.log(
    result.changed
      ? 'OK: tela "Update Account Information" do Keycloak desativada (login com Google entra direto no app).'
      : 'OK: já estava desativada.',
  );
} catch (err) {
  console.error(`Falha ao configurar o Keycloak: ${err.message}`);
  console.error(
    'Alternativa manual: Admin Console → realm pelada → Authentication → ' +
      '"first broker login" → execução "Review Profile" → Requirement = Disabled.',
  );
  process.exit(1);
}

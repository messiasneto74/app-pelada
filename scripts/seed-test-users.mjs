import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { envFromDotenv } from './lib/env-from-dotenv.mjs';
import { seedTestUsers } from './lib/seed-test-users.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

const apiUrl = process.env.SEED_API_URL ?? 'http://localhost:3000';
const keycloakUrl = envFromDotenv('KEYCLOAK_URL', 'http://localhost:8080', envPath);
const realm = envFromDotenv('KEYCLOAK_REALM', 'pelada', envPath);
const clientId = envFromDotenv('KEYCLOAK_CLIENT_ID', 'pelada-web', envPath);
const tokenUrl = `${keycloakUrl.replace(/\/$/, '')}/realms/${realm}/protocol/openid-connect/token`;

const organizerEmail = process.env.SEED_ORGANIZER_EMAIL;
const organizerPassword = process.env.SEED_ORGANIZER_PASSWORD;
const peladaId = process.env.SEED_PELADA_ID;
const userCount = Number(process.env.SEED_USER_COUNT ?? 50);
const matchCount = Number(process.env.SEED_MATCH_COUNT ?? 4);
const attendanceRate = Number(process.env.SEED_ATTENDANCE_RATE ?? 0.7);
const password = process.env.SEED_PASSWORD ?? 'Teste@12345';

if (!organizerEmail || !organizerPassword || !peladaId) {
  console.error(
    'Uso: SEED_ORGANIZER_EMAIL=... SEED_ORGANIZER_PASSWORD=... SEED_PELADA_ID=... node scripts/seed-test-users.mjs',
  );
  console.error('Ver docs/seed-usuarios-teste.md para todas as opções.');
  process.exit(1);
}

const { users, matches } = await seedTestUsers({
  apiUrl,
  tokenUrl,
  clientId,
  organizerEmail,
  organizerPassword,
  peladaId,
  userCount,
  matchCount,
  attendanceRate,
  password,
});

const outDir = join(root, '.seed-output');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `test-users-${Date.now()}.json`);
writeFileSync(
  outFile,
  JSON.stringify(
    {
      peladaId,
      password,
      users: users.map((u) => ({ email: u.email, name: u.name, playerId: u.playerId })),
      matches: matches.map((m) => ({ id: m.id, scheduledAt: m.scheduledAt, presenceMode: m.presenceMode })),
    },
    null,
    2,
  ),
);

console.log('');
console.log(`OK: ${users.length} usuários de teste, ${matches.length} partidas.`);
console.log(`Senha de todos: ${password}`);
console.log(`Lista completa (e-mails): ${outFile}`);

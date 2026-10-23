import { existsSync, readFileSync } from 'node:fs';

/** Lê uma chave do process.env ou de um arquivo .env (sem dependências). */
export function envFromDotenv(key, fallback, envPath) {
  if (process.env[key]) return process.env[key];
  if (!envPath || !existsSync(envPath)) return fallback;
  const line = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  if (!line) return fallback;
  const raw = line.slice(key.length + 1).trim();
  return raw.replace(/^["']|["']$/g, '') || fallback;
}

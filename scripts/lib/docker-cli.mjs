import { existsSync } from 'node:fs';
import path from 'node:path';

/** Caminho do docker.exe no Windows (Docker Desktop) ou `docker` no PATH. */
export function resolveDockerExecutable() {
  if (process.platform === 'win32') {
    const base = process.env.ProgramFiles || 'C:\\Program Files';
    const candidates = [
      path.join(base, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
      path.join(base, 'Docker', 'Docker', 'resources', 'docker.exe'),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return 'docker';
}

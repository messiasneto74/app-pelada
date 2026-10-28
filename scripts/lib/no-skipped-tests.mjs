import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const TEST_FILE_PATTERN = /\.(?:spec|test)\.(?:ts|js|mjs|cjs)$/;

const FORBIDDEN_MARKERS = [
  {
    kind: 'skip/only/todo',
    pattern: /\b(?:describe|it|test)\s*\.\s*(?:skip(?:If)?|only|todo)\b/,
  },
  {
    kind: 'alias focado ou pulado',
    pattern: /\b(?:xdescribe|xit|xtest|fdescribe|fit|ftest)\s*\(/,
  },
  {
    kind: 'pending explícito',
    pattern: /\bpending\s*\(/,
  },
];

const CONDITIONAL_DB_HARNESS =
  /^\s*\(\s*\w+\s*\?\s*describe\s*:\s*describe\.skip\s*\)/;

export function scanTestSource(source, file = '<memory>') {
  const violations = [];

  source.split(/\r?\n/).forEach((line, index) => {
    if (CONDITIONAL_DB_HARNESS.test(line)) {
      return;
    }
    for (const marker of FORBIDDEN_MARKERS) {
      if (marker.pattern.test(line)) {
        violations.push({
          file,
          line: index + 1,
          kind: marker.kind,
          excerpt: line.trim(),
        });
      }
    }
  });

  return violations;
}

async function collectTestFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
      continue;
    }

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(path)));
    } else if (TEST_FILE_PATTERN.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}

export async function findForbiddenTestMarkers(workspaceRoot) {
  const roots = ['apps', 'packages', 'scripts', 'prototipo'];
  const files = [];

  for (const root of roots) {
    try {
      files.push(...(await collectTestFiles(join(workspaceRoot, root))));
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const violations = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    violations.push(...scanTestSource(source, relative(workspaceRoot, file)));
  }

  return violations;
}

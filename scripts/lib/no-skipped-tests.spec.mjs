import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  findForbiddenTestMarkers,
  scanTestSource,
} from './no-skipped-tests.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('no-skipped-tests policy', () => {
  it('accepts ordinary tests', () => {
    expect(scanTestSource("describe('suite', () => { it('works', () => {}); });")).toEqual(
      [],
    );
  });

  it('allows conditional describe for DB/harness (RUN_DB_TESTS)', () => {
    expect(
      scanTestSource("(runDb ? describe : describe.skip)('Prisma', () => {});"),
    ).toEqual([]);
  });

  it('reports skipped, focused, todo and pending markers with line numbers', () => {
    const source = [
      ['describe', ".skip('skip', () => {});"].join(''),
      ['it', ".only('focus', () => {});"].join(''),
      ['test', ".todo('todo');"].join(''),
      ['xdescribe', "('alias', () => {});"].join(''),
      ['pending', '();'].join(''),
    ].join('\n');

    expect(scanTestSource(source, 'sample.spec.ts')).toMatchObject([
      { file: 'sample.spec.ts', line: 1, kind: 'skip/only/todo' },
      { file: 'sample.spec.ts', line: 2, kind: 'skip/only/todo' },
      { file: 'sample.spec.ts', line: 3, kind: 'skip/only/todo' },
      { file: 'sample.spec.ts', line: 4, kind: 'alias focado ou pulado' },
      { file: 'sample.spec.ts', line: 5, kind: 'pending explícito' },
    ]);
  });

  it('scans test files and ignores generated or non-test files', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'pelada-test-policy-'));
    temporaryDirectories.push(workspace);
    await mkdir(join(workspace, 'apps', 'web', 'coverage'), { recursive: true });
    await writeFile(
      join(workspace, 'apps', 'web', 'feature.spec.ts'),
      ['it', ".skip('blocked', () => {});"].join(''),
    );
    await writeFile(
      join(workspace, 'apps', 'web', 'ordinary.ts'),
      ['it', ".skip('not a test file', () => {});"].join(''),
    );
    await writeFile(
      join(workspace, 'apps', 'web', 'coverage', 'ignored.spec.ts'),
      ['it', ".skip('generated', () => {});"].join(''),
    );

    await expect(findForbiddenTestMarkers(workspace)).resolves.toMatchObject([
      { file: expect.stringMatching(/feature\.spec\.ts$/), line: 1 },
    ]);
  });
});

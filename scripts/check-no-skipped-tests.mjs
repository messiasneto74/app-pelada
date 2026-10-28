import { findForbiddenTestMarkers } from './lib/no-skipped-tests.mjs';

const violations = await findForbiddenTestMarkers(process.cwd());

if (violations.length > 0) {
  console.error('BLOQUEADO: existem testes pulados, focados ou pendentes:');
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} [${violation.kind}] ${violation.excerpt}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log('OK: nenhum teste pulado, focado ou pendente.');
}

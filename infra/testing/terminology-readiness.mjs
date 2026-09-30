import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// This is a specification coverage gate, NOT a functional test or test counter.
// Only remove a blocker after its referenced acceptance scenario is implemented
// and exercised against real PostgreSQL. Passing unit tests cannot waive it.
const requirements = [
  ['TERM-CODE-CAPTURE', 'Código gravado com sistema, versão, idioma, código e termo original', 'docs/modulos.md: Terminologias; docs/conformidade-sbis.md ECF.17.10'],
  ['TERM-DATA-INDEPENDENCE', 'Parâmetros, tabelas e terminologias em banco de dados, nunca em código-fonte', 'docs/modulos.md: Terminologias; docs/conformidade-sbis.md ECF.17.12'],
  ['TERM-REIMPORT-VERSIONING', 'Rodar o importador de novo atualiza a versão sem apagar a anterior', 'docs/modulos.md: Terminologias'],
];
const root = fileURLToPath(new URL('../../', import.meta.url));
const reportFile = path.join(root, 'artifacts/functional-tests.json');
if (!fs.existsSync(reportFile)) throw new Error('Missing functional test report. Run npm run test:api:functional first.');
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
if (report.version !== 1 || !report.success || report.skipped || report.exitCode !== 0 || !report.tests?.length) {
  throw new Error('Functional tests failed, were skipped, or produced an invalid report. Production readiness is not established.');
}
for (const test of report.tests) {
  if (!/^infra\/testing\/[^/]+\.functional\.test\.ts$/.test(test.file)) throw new Error('Invalid test report path');
  if (createHash('sha256').update(fs.readFileSync(path.join(root, test.file))).digest('hex') !== test.sha256) {
    throw new Error('Functional test report is stale: ' + test.file);
  }
}
const covered = new Set(report.passed.map(result => result.requirement));
const blockers = requirements.filter(([id]) => !covered.has(id));
const lines = [
  blockers.length ? '# Terminologias: prontidão de especificação bloqueada' : '# Terminologias: requisitos de aceitação cobertos',
  '',
  'Esta etapa não representa falha de migração. Os requisitos abaixo continuam sem implementação/aceitação funcional.',
  'Não são testes aprovados, ignorados nem simulados. A aprovação das suítes existentes não comprova estes requisitos.',
  '',
  ...blockers.map(([id, reason, source]) => `- ${id}: ${reason}. Fonte: ${source}.`),
  '',
  'Detalhes: GitHub issue #9 (Implementação V1 — Terminologias); docs/modulos.md; docs/conformidade-sbis.md.',
];
console.error(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
process.exitCode = blockers.length ? 1 : 0;

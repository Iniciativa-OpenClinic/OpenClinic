import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// This is a specification coverage gate, NOT a functional test or test counter.
// Only remove a blocker after its referenced acceptance scenario is implemented
// and exercised against the running API. Passing CRUD tests cannot waive it.
const requirements = [
  ...['REG-CRUD', 'AG-CREATE', 'AG-DURATION', 'AG-ROOM', 'AG-RESOURCES', 'AG-FITIN', 'AG-AVAILABILITY', 'AG-AVAILABILITY-INPUT', 'AG-TIMEZONE', 'AG-CONFLICT', 'AG-CONCURRENCY', 'AG-BLOCKS', 'AG-BLOCK-CRUD', 'AG-VERSION', 'AG-LIFECYCLE', 'AG-QUEUE', 'AG-DEVIATIONS', 'AG-DELETE', 'SEC-TENANT', 'SEC-AUTH', 'SEC-ACL']
    .map(id => [id, 'Cenário operacional precisa passar com HTTP e PostgreSQL reais', 'docs/cadastros.md; docs/modulos.md; contratos de API']),
  ['AG-HISTORY', 'Autoria, proveniência e histórico consultável de correções', 'docs/modulos.md: princípios e Auditoria e Proveniência'],
  ['AG-FHIR', 'Contrato e modelo conformes ao subconjunto FHIR R4, com Appointment/Encounter corretamente separados', 'docs/decisions/0001-fhir-como-padrao-de-dados.md; docs/modulos.md: Agenda'],
  ['AG-SESSIONS', 'Marcação de sessão planejada vinculada ao pacote, com confirmação humana e retirada atômica da fila', 'docs/cadastros.md: Agendamento e Sessão planejada'],
  ['AG-INTEGRATION', 'Identidade autenticada do parceiro preservada na origem do agendamento', 'docs/modulos.md: Identidade e Acesso, Agenda'],
  ['AG-PAYER', 'Referência persistida à fonte pagadora, com Particular na V1', 'docs/cadastros.md: Agendamento; docs/modulos.md: Convênios e pagadores'],
  ['AG-WEBHOOK', 'Notificações mínimas com assinatura, reenvio e idempotência', 'docs/prd.md: Webhooks'],
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
const reference = 'origin/main c6627a1ba468bfefbf11562d9064a1e9ea9789c8';
const lines = [
  blockers.length ? '# Agenda: prontidão de especificação bloqueada' : '# Agenda: requisitos de aceitação cobertos',
  '',
  `Referência: ${reference}.`,
  'Esta etapa não representa falha de migração. Os requisitos abaixo continuam sem implementação/aceitação funcional.',
  'Não são testes aprovados, ignorados nem simulados. A aprovação das suítes existentes não comprova estes requisitos.',
  '',
  ...blockers.map(([id, reason, source]) => `- ${id}: ${reason}. Fonte: ${source}.`),
  '',
  'Detalhes: docs/appointment-review.md e docs/agenda-testing.md.',
];
console.error(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
process.exitCode = blockers.length ? 1 : 0;

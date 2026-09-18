import { testDatabaseUrl } from '../../database/test-connection.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

export function exitCode(gates) {
  if (gates.some(g => g.status === 'FAILED')) return 1;
  if (gates.some(g => ['BLOCKED', 'SKIPPED'].includes(g.status))) return 2;
  return gates.length ? 0 : 2;
}

export function integrationReady(env, authorized) {
  if (!authorized) return 'Disposable resource execution was not explicitly authorized';
  try { testDatabaseUrl(env); } catch (error) { return error.message; }
  return null;
}

export function parseCounts(output) {
  const clean = output.replace(/\x1b\[[0-9;]*m/g, '');
  const nodeLines = [...clean.matchAll(/^[#ℹ] (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gm)];
  const node = {};
  for (const m of nodeLines) node[m[1]] = (node[m[1]] ?? 0) + Number(m[2]);
  const vitest = {};
  for (const line of clean.matchAll(/^\s*Tests\s+(.+)$/gm)) for (const m of line[1].matchAll(/(\d+) (passed|failed|skipped|todo)/g)) vitest[m[2]] = (vitest[m[2]] ?? 0) + Number(m[1]);
  if (!Object.keys(node).length && !Object.keys(vitest).length) return null;
  return { node: Object.keys(node).length ? node : null, vitest: Object.keys(vitest).length ? vitest : null,
    skipped: (node.skipped ?? 0) + (node.todo ?? 0) + (vitest.skipped ?? 0) + (vitest.todo ?? 0),
    failed: (node.fail ?? 0) + (node.cancelled ?? 0) + (vitest.failed ?? 0),
    executed: (node.pass ?? 0) + (node.fail ?? 0) + (vitest.passed ?? 0) + (vitest.failed ?? 0) };
}

export async function executeNpm(root, args, { timeoutMs = 600000, env = process.env } = {}) {
  const npmPath = env.npm_execpath;
  if (!npmPath || !fs.existsSync(npmPath)) return { status: 'BLOCKED', exitCode: null, durationMs: 0, counts: null, reason: 'Run through npm; npm CLI path is unavailable' };
  const start = Date.now();
  return new Promise(resolve => {
    let output = '', timedOut = false, spawnError = false, overflow = false, cancelled = false;
    const child = spawn(process.execPath, [npmPath, ...args], { cwd: root, env: { ...env, CI: 'true', FORCE_COLOR: '0' }, shell: false, detached: process.platform !== 'win32', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const collect = data => { if (output.length < 2_000_000) output += data.toString(); else overflow = true; };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.on('error', () => { spawnError = true; });
    const stop = () => {
      if (!child.pid) return;
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      else { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
    };
    const cancel = () => { cancelled = true; stop(); };
    process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    child.on('close', code => {
      clearTimeout(timer);
      process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
      const counts = parseCounts(output);
      const skipped = (counts?.skipped ?? 0) + (counts?.todo ?? 0);
      const failed = (counts?.failed ?? 0) + (counts?.fail ?? 0);
      const status = spawnError ? 'BLOCKED' : timedOut || cancelled || code !== 0 || failed ? 'FAILED' : skipped || overflow ? 'SKIPPED' : 'PASSED';
      resolve({ status, cancelled, exitCode: code, durationMs: Date.now() - start, counts,
        reason: cancelled ? 'Cancelled; verify cleanup of disposable resources' : spawnError ? 'Process unavailable' : timedOut ? 'Timeout; verify cleanup of disposable resources' : overflow ? 'Output limit exceeded; result requires review' : skipped ? 'Test runner reported skipped cases; review required' : code !== 0 ? 'Command failed; rerun the displayed command in a controlled environment for diagnostics' : 'Command completed; no per-scenario approval inferred' });
    });
  });
}

export function repositoryIdentity(root) {
  const git = args => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  const hash = createHash('sha256');
  const entries = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (e.isSymbolicLink() || ['node_modules', 'dist', '.git', '.temp', 'reports', 'secrets', 'coverage'].includes(e.name) || e.name.startsWith('.env')) continue;
      const file = path.join(dir, e.name);
      if (e.isDirectory()) walk(file);
      else if (/\.(?:ts|tsx|mjs|js|json|md|sql|ya?ml)$/.test(e.name)) entries.push(file);
    }
  }
  for (const dir of ['packages', 'infra/compliance', 'infra/database', 'docs', '.github']) walk(path.join(root, dir));
  for (const name of ['package.json', 'package-lock.json']) if (fs.existsSync(path.join(root, name))) entries.push(path.join(root, name));
  for (const file of entries.sort()) hash.update(path.relative(root, file)).update(fs.readFileSync(file));
  return { commit: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']), dirty: Boolean(git(['status', '--porcelain'])), sourceFingerprint: hash.digest('hex'), fingerprintFiles: entries.length };
}

export function writeReport(root, result) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const id = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate()) + '-application-verification-' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '-' + randomUUID().slice(0,8);
  const dir = path.join(root, 'infra/compliance/reports');
  fs.mkdirSync(dir, { recursive: true });
  const base = id;
  const json = path.join(dir, base + '.json');
  const md = path.join(dir, base + '.md');
  fs.writeFileSync(json, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  const safe = v => String(v ?? '—').replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
  const rows = result.gates.map(g => '| ' + [g.id, g.command, g.status, g.exitCode, g.durationMs, JSON.stringify(g.counts), g.reason].map(safe).join(' | ') + ' |').join('\n');
  const scenarios = result.scenarios.map(s => '| ' + [s.id, s.mapping, s.result, s.relatedGates.map(g => g.id + ':' + g.status).join(', ')].map(safe).join(' | ') + ' |').join('\n');
  const text = '# Verificação automatizada — ' + safe(result.project.name) + '\n\n' +
    '- Data UTC: ' + result.createdAt + '\n- Versão do manifest: ' + safe(result.project.version) +
    '\n- Escopo do catálogo: ' + safe(result.scope) + '\n- Perfil: ' + result.profile +
    '\n- Gates selecionados: ' + (result.exitCode === 0 ? 'aprovados no escopo executado' : result.exitCode === 1 ? 'com falhas' : 'inconclusivos') +
    '\n- Parecer sobre todos os cenários: inconclusivo; requer evidência individual.\n- Base: ' + safe(JSON.stringify(result.identity)) +
    '\n\n## Gates\n\n| Gate | Comando | Estado | Exit code | ms | Contadores | Observação |\n| --- | --- | --- | --- | --- | --- | --- |\n' + rows +
    '\n\n## Cenários e lacunas\n\n| ID | Mapeamento | Resultado do cenário | Gates relacionados |\n| --- | --- | --- | --- |\n' + scenarios +
    '\n\nUm gate aprovado não comprova todos os passos de um cenário. As suites de unidade/tipagem são globais quando indicado no plano. HTTP real, navegador, análise arquitetural e parecer técnico não são simulados pelo runner. Nenhuma nota ou autoria de especialista é gerada automaticamente.\n\n## Evidências e limitações\n\n[Resultados estruturados](./' + path.basename(json) + '). Saída bruta não é persistida nem reproduzida para evitar vazamento de credenciais. Contadores não reconhecidos são null, não zero. Reexecute o comando indicado para diagnóstico em ambiente controlado.\n';
  fs.writeFileSync(md, text, { flag: 'wx' });
  return path.relative(root, md).replaceAll('\\', '/');
}

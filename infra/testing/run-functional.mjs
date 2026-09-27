import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = path.join(root, 'infra/testing');
const files = fs.readdirSync(directory).filter(name => name.endsWith('.functional.test.ts')).sort().map(name => path.join(directory, name));
if (!files.length) throw new Error('No functional test files were found');
const outputDirectory = path.join(root, 'artifacts');
fs.mkdirSync(outputDirectory, { recursive: true });
const reportFile = path.join(outputDirectory, 'functional-tests.json');
// Never allow a stale successful report to survive a failed launch.
fs.rmSync(reportFile, { force: true });
const log = fs.createWriteStream(path.join(outputDirectory, 'functional-tests.tap'));
const child = spawn(process.execPath, ['--import', 'tsx', '--test', '--test-reporter=tap', '--test-concurrency=1', ...process.argv.slice(2), ...files], { cwd: root, env: process.env, stdio: ['inherit', 'pipe', 'pipe'] });
let stdout = '';
child.stdout.on('data', data => { stdout += data; process.stdout.write(data); log.write(data); });
child.stderr.on('data', data => { process.stderr.write(data); log.write(data); });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('close', (code, signal) => {
  const passed = [...stdout.matchAll(/^ok \d+ - \[([^\]]+)\] (.+)$/gm)].map(match => ({ requirement: match[1], scenario: match[2] }));
  const failed = [...stdout.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1]);
  const skipped = /^ok \d+ .*# (?:SKIP|TODO)/mi.test(stdout) || /^# (?:skipped|todo) [1-9]/m.test(stdout);
  const success = code === 0 && passed.length > 0 && failed.length === 0 && !skipped;
  fs.writeFileSync(reportFile, JSON.stringify({ version: 1, success, exitCode: code, signal, skipped, passed, failed,
    tests: files.map(file => ({ file: path.relative(root, file).replaceAll('\\', '/'), sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') })) }, null, 2) + '\n');
  log.end();
  process.exitCode = success ? 0 : 1;
});

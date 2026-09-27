import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// This test creates its own resources. It never reads the workspace .env.
const root = fileURLToPath(new URL('../../', import.meta.url));
const prefix = `secret-eval-${randomBytes(5).toString('hex')}`;
const label = `secrets-evaluation=${prefix}`;
const resources = { services: [], secrets: [], network: '', volume: '', images: [] };
const values = [];
const password = () => { const value = randomBytes(32).toString('hex'); values.push(value); return value; };
const sanitize = text => values.reduce((result, value) => result.split(value).join('[REDACTED]'), text);

function docker(args, input, allowFailure = false) {
  const result = spawnSync('docker', args, { cwd: root, input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 600000 });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(sanitize(`Docker ${args[0]} failed: ${result.stderr || result.stdout || result.error?.message}`));
  }
  return result;
}

const delay = ms => new Promise(done => setTimeout(done, ms));
function createSecret(suffix, value) {
  values.push(value);
  const name = `${prefix}_${suffix}`;
  docker(['secret', 'create', '--label', label, name, '-'], value);
  resources.secrets.push(name);
  return name;
}
function mount(name, target, uid = '0') {
  return ['--secret', `source=${name},target=${target},uid=${uid},gid=${uid},mode=0400`];
}
function createService(suffix, options, image, command = []) {
  const name = `${prefix}_${suffix}`;
  docker(['service', 'create', '--quiet', '--detach', '--name', name, '--label', label,
    '--constraint', `node.id==${nodeId}`, ...options, image, ...command]);
  resources.services.push(name);
  return name;
}
async function waitTask(name, expected) {
  for (let attempt = 0; attempt < 90; attempt++) {
    const taskId = docker(['service', 'ps', '-q', '--no-trunc', name]).stdout.trim().split(/\r?\n/)[0];
    if (taskId) {
      const status = JSON.parse(docker(['inspect', '--type', 'task', '--format', '{{json .Status}}', taskId]).stdout);
      if (status.State === expected) return status;
      if (['failed', 'rejected'].includes(status.State) && expected !== 'failed') {
        const logs = docker(['service', 'logs', '--raw', name], undefined, true);
        throw new Error(sanitize(`${name} failed: ${status.Err ?? ''}\n${logs.stdout}\n${logs.stderr}`));
      }
    }
    await delay(1000);
  }
  throw new Error(`Timeout waiting for ${name} to reach ${expected}.`);
}

let nodeId;
try {
  const info = JSON.parse(docker(['info', '--format', '{{json .}}']).stdout);
  assert.equal(info.OSType, 'linux', 'Linux containers are required.');
  assert.equal(info.Swarm.LocalNodeState, 'active', 'Initialize a local Swarm before running this test.');
  assert.equal(info.Swarm.ControlAvailable, true, 'Run on a Swarm manager.');
  nodeId = info.Swarm.NodeID;
  console.log(`[${prefix}] Building evaluation images...`);
  for (const [suffix, file] of [['api', 'infra/docker/Dockerfile'], ['cli', 'infra/database/Dockerfile'], ['db', 'infra/docker/Dockerfile.postgres']]) {
    const image = `${prefix}-${suffix}:local`;
    console.log(`Building ${suffix}...`);
    docker(['build', '-f', file, '-t', image, '.']);
    resources.images.push(image);
  }
  const [apiImage, cliImage, dbImage] = resources.images;
  const rootPassword = password();
  const ownerPassword = password();
  const appPassword = password();
  const jwt = password();
  const adminPassword = password();
  const rootSecret = createSecret('postgres_password', rootPassword);
  const ownerSecret = createSecret('owner_password', ownerPassword);
  const appSecret = createSecret('app_password', appPassword);
  const ownerUrlSecret = createSecret('owner_url', `postgresql://openclinic_owner:${ownerPassword}@db:5432/openclinic_eval`);
  const appUrlSecret = createSecret('database_url', `postgresql://openclinic_app:${appPassword}@db:5432/openclinic_eval`);
  const jwtSecret = createSecret('jwt', jwt);
  const adminSecret = createSecret('admin', adminPassword);
  resources.network = `${prefix}_network`;
  docker(['network', 'create', '--driver', 'overlay', '--label', label, resources.network]);
  resources.volume = `${prefix}_data`;
  docker(['volume', 'create', '--label', label, resources.volume]);
  const network = ['--network', resources.network];
  const db = createService('db', [
    '--network', `name=${resources.network},alias=db`,
    '--env', 'POSTGRES_USER=postgres', '--env', 'POSTGRES_DB=openclinic_eval',
    '--env', 'POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password',
    ...mount(rootSecret, 'postgres_password', '70'), ...mount(ownerSecret, 'owner_password', '70'), ...mount(appSecret, 'app_password', '70'),
    '--mount', `type=volume,source=${resources.volume},target=/var/lib/postgresql/data`,
    '--health-cmd', 'pg_isready -U postgres -d openclinic_eval', '--health-interval', '2s',
  ], dbImage);
  await waitTask(db, 'running');
  for (let attempt = 0; ; attempt++) {
    const id = docker(['ps', '-q', '--filter', `label=com.docker.swarm.service.name=${db}`]).stdout.trim();
    // Check the final TCP listener, not the temporary initialization socket server.
    if (id && docker(['exec', id, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'openclinic_eval'], undefined, true).status === 0) break;
    if (attempt > 60) throw new Error('PostgreSQL did not become ready.');
    await delay(1000);
  }
  const commonEnv = ['--env', 'NODE_ENV=production', '--env', 'SECRETS_PROVIDER=file'];
  console.log('Running CLI setup with owner credentials...');
  const setup = createService('setup', [...network, ...commonEnv, '--restart-condition', 'none',
    '--env', 'DATABASE_OWNER_URL_FILE=/run/secrets/owner_url',
    '--env', 'DEFAULT_ADMIN_PASSWORD_FILE=/run/secrets/admin',
    ...mount(ownerUrlSecret, 'owner_url'), ...mount(adminSecret, 'admin'),
  ], cliImage, ['npm', 'run', 'db:setup']);
  await waitTask(setup, 'complete');
  const setupLogs = docker(['service', 'logs', '--raw', setup]);
  for (const value of values) assert.ok(!(setupLogs.stdout + setupLogs.stderr).includes(value), 'Setup logs contain a secret.');
  console.log('Starting API with runtime credentials and testing login...');
  const api = createService('api', [...network, ...commonEnv,
    '--env', 'DATABASE_URL_FILE=/run/secrets/database_url', '--env', 'JWT_KEY_FILE=/run/secrets/jwt',
    ...mount(appUrlSecret, 'database_url', '1001'), ...mount(jwtSecret, 'jwt', '1001'),
  ], apiImage);
  await waitTask(api, 'running');
  const container = docker(['ps', '-q', '--filter', `label=com.docker.swarm.service.name=${api}`]).stdout.trim();
  assert.ok(container, 'The evaluation API must run on this node.');
  // Pass the test login password through stdin, never argv or service environment.
  const probe = `let password=''; for await (const chunk of process.stdin) password+=chunk;
    for(let i=0;i<40;i++){try {const h=await fetch('http://127.0.0.1:3000/health/live'); if(h.ok) break;}catch{} await new Promise(r=>setTimeout(r,500));}
    const response=await fetch('http://127.0.0.1:3000/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:'superadmin',password})});
    const body=await response.json(); if(response.status!==200 || !body.access_token) throw Error('Login failed with status '+response.status);
    console.log('Health and login passed.');`;
  docker(['exec', '-i', container, 'node', '--input-type=module', '-e', probe], adminPassword);
  for (const name of resources.services) {
    const spec = docker(['service', 'inspect', '--format', '{{json .Spec.TaskTemplate.ContainerSpec}}', name]).stdout;
    for (const value of values) assert.ok(!spec.includes(value), 'Service spec contains a secret.');
  }
  const roleProbe = `import postgres from 'postgres'; import {readFileSync} from 'node:fs';
    const sql=postgres(readFileSync('/run/secrets/database_url','utf8'));
    const [r]=await sql\`SELECT current_user AS name, rolsuper, rolcreatedb, rolcreaterole, has_schema_privilege(current_user,'public','CREATE') AS can_create FROM pg_roles WHERE rolname=current_user\`;
    await sql.end(); if(r.name!=='openclinic_app'||r.rolsuper||r.rolcreatedb||r.rolcreaterole||r.can_create) throw Error('Runtime role is privileged');`;
  docker(['exec', container, 'node', '--input-type=module', '-e', roleProbe]);
  console.log('Testing failure when a configured secret is missing...');
  const missing = createService('missing', [...commonEnv, '--restart-condition', 'none',
    '--env', 'JWT_KEY_FILE=/run/secrets/does_not_exist'], apiImage);
  await waitTask(missing, 'failed');
  const missingLogs = docker(['service', 'logs', '--raw', missing], undefined, true);
  assert.match(missingLogs.stdout + missingLogs.stderr, /Cannot read JWT_KEY_FILE/);
  const report = { passed: true, timestamp: new Date().toISOString(), prefix,
    checks: ['CLI migrations and admin via mounted secrets', 'no secrets in setup logs or service specs',
      'API health and login via mounted secrets', 'runtime role has no superuser or schema creation privileges', 'missing file prevents API startup'] };
  mkdirSync(resolve(root, '.temp'), { recursive: true });
  writeFileSync(resolve(root, '.temp', 'swarm-secrets-result.json'), JSON.stringify(report, null, 2));
  console.log('PASS: Swarm evaluation completed.');
} catch (error) {
  console.error(sanitize(error instanceof Error ? error.message : 'Evaluation failed.'));
  process.exitCode = 1;
} finally {
  console.log(`Cleaning only resources created by ${prefix}...`);
  for (const name of [...resources.services].reverse()) docker(['service', 'rm', name], undefined, true);
  for (let attempt = 0; attempt < 30; attempt++) {
    const containers = docker(['ps', '-aq', '--filter', `label=com.docker.swarm.service.name=${prefix}_db`], undefined, true).stdout.trim();
    const networkResult = resources.network ? docker(['network', 'rm', resources.network], undefined, true) : { status: 0 };
    const volumeResult = resources.volume && !containers ? docker(['volume', 'rm', resources.volume], undefined, true) : { status: containers ? 1 : 0 };
    if (networkResult.status === 0 && volumeResult.status === 0) break;
    await delay(1000);
  }
  for (const name of resources.secrets) docker(['secret', 'rm', name], undefined, true);
  for (const name of resources.images) docker(['image', 'rm', name], undefined, true);
  const remaining = [];
  for (const kind of ['service', 'secret', 'network', 'volume']) {
    const result = docker([kind, 'ls', '-q', '--filter', `label=${label}`], undefined, true);
    if (result.status !== 0 || result.stdout.trim()) remaining.push(kind);
  }
  if (remaining.length) {
    console.error(`Check remaining evaluation resources with label ${label}: ${remaining.join(', ')}`);
    process.exitCode = 1;
  }
}

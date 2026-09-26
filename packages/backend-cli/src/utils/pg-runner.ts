import { execSync, execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

export interface PgConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  isLocal?: boolean;
  connectionUrl?: string;
}

export interface PgDumpConfig extends PgConnectionConfig {
  outputPath: string;
}

export interface PgRestoreConfig extends PgConnectionConfig {
  inputPath: string;
  clean?: boolean;
}

/**
 * Formats a date into a clean, human-readable ISO-like timestamp for backup filenames (YYYYMMDD_HHmmss).
 */
export function formatBackupTimestamp(date: Date = new Date()): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '_')
    .split('.')[0]!;
}

/**
 * Searches for an active Docker container running Postgres on the host
 */
export function getRunningPostgresContainer(): string | null {
  if (process.env['PG_CLIENT_CONTAINER']) return process.env['PG_CLIENT_CONTAINER'];
  try {
    const output = execSync('docker ps --format "{{.Names}}\t{{.Image}}"', {
      stdio: ['pipe', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    const lines = output.trim().split('\n');
    for (const line of lines) {
      const [name, image] = line.split('\t');
      if (
        (image && (image.includes('postgres') || image.includes('pgvector'))) ||
        (name && (name.includes('postgres') || name === process.env['PG_CLIENT_CONTAINER']))
      ) {
        return name?.trim() ?? null;
      }
    }
  } catch {
    // Docker is not available or not running
  }
  return null;
}

/**
 * Resolves host binaries for pg_dump and pg_restore on Windows/Linux
 */
export function resolveHostBinary(binaryName: 'pg_dump' | 'pg_restore'): string | null {
  try {
    const checkCmd = process.platform === 'win32' ? `where ${binaryName}` : `which ${binaryName}`;
    const result = execSync(checkCmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' });
    const firstLine = result.trim().split('\n')[0]?.trim();
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // Not found in PATH
  }

  // Search common PostgreSQL installation locations on Windows
  if (process.platform === 'win32') {
    const baseDir = 'C:\\Program Files\\PostgreSQL';
    if (fs.existsSync(baseDir)) {
      const versions = fs.readdirSync(baseDir).sort().reverse();
      for (const ver of versions) {
        const binPath = path.join(baseDir, ver, 'bin', `${binaryName}.exe`);
        if (fs.existsSync(binPath)) {
          return binPath;
        }
      }
    }
  }

  return null;
}

/**
 * Tests direct connectivity to the PostgreSQL database
 */
export async function testPgConnection(config: PgConnectionConfig): Promise<{ success: boolean; error?: string }> {
  const connString = config.connectionUrl ?? `postgresql://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password || '')}@${config.host}:${config.port}/${config.database}`;
  const sql = postgres(connString, { connect_timeout: 8, max: 1 });
  try {
    await sql`SELECT 1`;
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  } finally {
    await sql.end();
  }
}

function connectionArgs(config: PgConnectionConfig, docker = false): string[] {
  if (config.connectionUrl) {
    const url = new URL(config.connectionUrl);
    url.password = '';
    if (docker && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) url.hostname = 'host.docker.internal';
    return ['--dbname', url.toString()];
  }
  const host = docker && ['localhost', '127.0.0.1', '::1'].includes(config.host) ? 'host.docker.internal' : config.host;
  return ['-h', host, '-p', String(config.port), '-U', config.user, '-d', config.database];
}

function runClient(binary: string, args: string[], config: PgConnectionConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { env: { ...process.env, PGPASSWORD: config.password || '' }, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error('PostgreSQL client failed with exit code ' + code)));
  });
}

/** A failed or partial backup must never be used for restore. */
export async function executePgDump(config: PgDumpConfig): Promise<void> {
  const output = path.resolve(config.outputPath);
  const partial = output + '.partial';
  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (fs.existsSync(output)) throw new Error('Backup already exists: ' + output);
  const native = resolveHostBinary('pg_dump');
  if (native) {
    await runClient(native, [...connectionArgs(config), '-Fc', '-f', partial], config);
  } else {
    const container = getRunningPostgresContainer();
    if (!container) throw new Error('Install PostgreSQL client tools or set PG_CLIENT_CONTAINER.');
    const temporary = '/tmp/pg_dump_' + Date.now() + '.dump';
    try {
      await runClient('docker', ['exec', '-e', 'PGPASSWORD', container, 'pg_dump', ...connectionArgs(config, true), '-Fc', '-f', temporary], config);
      execFileSync('docker', ['cp', container + ':' + temporary, partial], { stdio: 'inherit' });
    } finally {
      try { execFileSync('docker', ['exec', container, 'rm', '-f', temporary], { stdio: 'ignore' }); } catch { /* Preserve original error. */ }
    }
  }
  if (!fs.statSync(partial).size) throw new Error('Empty backup refused.');
  fs.renameSync(partial, output);
}

/** Restore is atomic and every nonzero exit status is an error. */
export async function executePgRestore(config: PgRestoreConfig): Promise<void> {
  const input = path.resolve(config.inputPath);
  if (!fs.existsSync(input)) throw new Error('Backup not found: ' + input);
  const flags = ['--exit-on-error', '--single-transaction', '--no-owner', ...(config.clean ? ['--clean', '--if-exists'] : [])];
  const native = resolveHostBinary('pg_restore');
  if (native) {
    await runClient(native, [...connectionArgs(config), ...flags, input], config);
    return;
  }
  const container = getRunningPostgresContainer();
  if (!container) throw new Error('Install PostgreSQL client tools or set PG_CLIENT_CONTAINER.');
  const temporary = '/tmp/pg_restore_' + Date.now() + '.dump';
  try {
    execFileSync('docker', ['cp', input, container + ':' + temporary], { stdio: 'inherit' });
    await runClient('docker', ['exec', '-e', 'PGPASSWORD', container, 'pg_restore', ...connectionArgs(config, true), ...flags, temporary], config);
  } finally {
    try { execFileSync('docker', ['exec', container, 'rm', '-f', temporary], { stdio: 'ignore' }); } catch { /* Preserve original error. */ }
  }
}

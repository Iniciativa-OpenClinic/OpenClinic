import path from 'node:path';
import { executePgDump } from './pg-runner.js';

export interface DatabaseOptions {
  target?: 'local' | 'remote';
  confirmTarget?: string;
  check?: boolean;
  apply?: boolean;
  demo?: boolean;
  reconcileLegacy?: boolean;
}

export function resolveDatabaseTarget(options: DatabaseOptions = {}, write = false) {
  const target = options.target ?? 'local';
  if (!['local', 'remote'].includes(target)) throw new Error('Target must be local or remote.');
  const key = target === 'remote' ? 'REMOTE_DATABASE_OWNER_URL' : 'DATABASE_OWNER_URL';
  const url = process.env[key];
  if (!url) throw new Error(`${key} is required; runtime credentials are never used for migrations.`);
  const parsed = new URL(url);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || parsed.pathname.length < 2) throw new Error(`Invalid ${key}.`);
  if (target === 'local' && !['localhost', '127.0.0.1', '[::1]', 'db', 'openclinic-postgres'].includes(parsed.hostname)) {
    throw new Error('Local target must use a local host. Use --target remote with REMOTE_DATABASE_OWNER_URL.');
  }
  const identity = `${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  if (write && target === 'remote' && options.confirmTarget !== identity) throw new Error(`Remote write requires --confirm-target ${identity}`);
  return { target, url, parsed, identity };
}

export async function backupBeforeRemoteWrite(destination: ReturnType<typeof resolveDatabaseTarget>, includeLocal = false) {
  if (destination.target !== 'remote' && !includeLocal) return;
  const outputPath = path.resolve('backups', `before-migration-${Date.now()}.dump`);
  await executePgDump({
    host: destination.parsed.hostname, port: Number(destination.parsed.port || 5432),
    database: decodeURIComponent(destination.parsed.pathname.slice(1)), user: decodeURIComponent(destination.parsed.username),
    password: decodeURIComponent(destination.parsed.password), outputPath, connectionUrl: destination.url,
  });
  console.log(`Backup: ${outputPath}`);
}

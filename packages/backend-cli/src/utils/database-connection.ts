import fs from 'node:fs';
import path from 'node:path';
import {
  SYSTEM_DEFAULTS,
  getDatabaseEnv,
  resolveDatabaseOwnerUrl,
  parseDatabaseUrl,
  isDdlRole,
  parseDatabaseSecret,
  type DatabaseEnvironment,
} from '@openclinic/core';
import { executePgDump, formatBackupTimestamp } from './pg-runner.js';

export { isDdlRole };

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  ownerUser: string;
  ownerPassword?: string;
  appUser: string;
  appPassword?: string;
  isAppUserDdl: boolean;
}

export interface DatabaseOptions {
  target?: string;
  confirmTarget?: string;
  check?: boolean;
  apply?: boolean;
  demo?: boolean;
  backup?: boolean;
}

const SUPPORTED_PG_PROTOCOLS = ['postgres:', 'postgresql:'] as const;
const BACKUPS_DIR = 'backups';
const FALLBACK_DB_NAME = 'database';

const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  '0.0.0.0',
  'db',
  'postgres',
  'host.docker.internal',
]);

/**
 * Checks whether a hostname corresponds to a local environment, loopback or local container.
 */
export function isLocalHost(hostname: string): boolean {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  return (
    LOCAL_HOSTNAMES.has(lower) ||
    lower.endsWith('.local') ||
    lower.endsWith('.localhost')
  );
}

/**
 * Generic helper to transparently load database credentials from local secrets directory or volume mounts
 * if the target environment connection string is not already populated.
 */
function tryLoadLocalSecret(
  targetEnvKey: 'DATABASE_URL' | 'DATABASE_OWNER_URL',
  secretName: string,
  environment: Record<string, string | undefined>
): void {
  if (environment[targetEnvKey]) return;

  const customDir = environment['SECRETS_DIR'];
  const searchDirs: string[] = [
    '/run/secrets',
    ...(customDir ? [path.resolve(process.cwd(), customDir)] : []),
    path.resolve(process.cwd(), 'secrets'),
    path.resolve(process.cwd(), '../secrets'),
    path.resolve(process.cwd(), '../../secrets'),
  ];

  const candidateFilenames = [
    secretName,
    `${secretName}.json`,
    `${secretName}.txt`,
  ];

  for (const dir of searchDirs) {
    for (const filename of candidateFilenames) {
      const candidatePath = path.resolve(dir, filename);
      if (fs.existsSync(candidatePath)) {
        try {
          const raw = fs.readFileSync(candidatePath, 'utf8').trim();
          if (!raw) continue;

          environment[targetEnvKey] = parseDatabaseSecret(raw, secretName, environment);
          return;
        } catch {
          // Continue searching if parse fails
        }
      }
    }
  }
}

/**
 * Attempts to load owner (DDL) credentials from secrets directory
 * if DATABASE_OWNER_URL is not explicitly populated.
 */
export function tryLoadLocalOwnerSecret(environment: Record<string, string | undefined> = process.env): void {
  const secretName = environment['DB_OWNER_SECRET_NAME'] || 'database-secret-owner';
  tryLoadLocalSecret('DATABASE_OWNER_URL', secretName, environment);
}

/**
 * Attempts to load runtime (DML) app credentials from secrets directory
 * if DATABASE_URL is not explicitly populated.
 */
export function tryLoadLocalAppSecret(environment: Record<string, string | undefined> = process.env): void {
  const secretName = environment['DB_APP_SECRET_NAME'] || 'database-secret-app';
  tryLoadLocalSecret('DATABASE_URL', secretName, environment);
}

/**
 * Resolves standard database configuration directly from atomic environment variables:
 * DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS via getDatabaseEnv().
 *
 * Invariant: Owner (DDL) credentials are NEVER stored in .env.
 * - Runtime/App (DML) credentials come strictly from atomic DB_USER and DB_PASS.
 * - Owner (DDL) credentials must be provided dynamically by the operator via CLI options/prompts,
 *   resolved via secrets manager, or auto-discovered from ./secrets/<DB_OWNER_SECRET_NAME>.json.
 *
 * Checks if DB_USER is configured with DDL vs DML privileges and emits appropriate warnings.
 */
export function getDatabaseConfig(environment: Record<string, string | undefined> = process.env): DatabaseConfig {
  tryLoadLocalAppSecret(environment);
  tryLoadLocalOwnerSecret(environment);
  const env: DatabaseEnvironment = getDatabaseEnv(environment);
  const host = env.host;
  const port = env.port;
  const database = env.database;
  const appUser = env.user;
  const appPassword = env.password;

  const defaultOwnerUser = database ? `${database}_owner` : '';
  const isAppUserDdl = isDdlRole(appUser, database);

  let ownerUser: string = defaultOwnerUser;
  let ownerPassword: string | undefined;

  if (isAppUserDdl) {
    console.warn(
      `\n⚠️  [SECURITY WARNING] The configured DB_USER ("${appUser}") has DDL/Owner naming privileges.\n` +
      `   Atomic runtime variables are strictly reserved for DML. DB_USER should be a restricted DML role ("${database ? `${database}_app` : '<database>_app'}").\n`
    );
  }

  if (environment['DATABASE_OWNER_URL']) {
    const parsedOwner = parseDatabaseUrl(environment['DATABASE_OWNER_URL']);
    if (parsedOwner.user) {
      ownerUser = parsedOwner.user;
      ownerPassword = parsedOwner.password;
    }
  } else {
    // Owner credentials MUST come from a secret provider (file/gsm/aws), never from atomic runtime variables (.env)
    ownerUser = defaultOwnerUser;
    ownerPassword = undefined;
  }

  return {
    host,
    port,
    database,
    ownerUser,
    ownerPassword,
    appUser,
    appPassword,
    isAppUserDdl,
  };
}

/**
 * Validates that owner (DDL) credentials are available for administrative tasks.
 * If missing, throws a clear error instructing the operator to provide them via secret provider or CLI.
 */
export function assertOwnerCredentials(config: DatabaseConfig): { user: string; password: string } {
  if (config.ownerPassword) {
    return { user: config.ownerUser, password: config.ownerPassword };
  }

  throw new Error(
    `Owner (DDL) credentials are required for this administrative operation, but were not found in secret provider.\n` +
    `Per security architecture, owner credentials must be provided via secret provider (database-secret-owner file, GSM, AWS) ` +
    `or dynamically via CLI parameters (--owner-user / --owner-password).\n` +
    `Atomic environment variables (.env) are strictly reserved for runtime application (DML) use.`
  );
}

/**
 * Resolves the target database connection for migrations and maintenance operations.
 * Enforces strict boundaries:
 * - Default/local target rejects external hosts unless explicit --target remote is provided.
 * - Remote write operations strictly require --confirm-target <identity>.
 * - Safety backups are triggered automatically for remote writes or when forced.
 */
export function resolveDatabaseTarget(options: DatabaseOptions = {}, _write = false) {
  const target = (options.target ?? 'local').toLowerCase().trim();
  if (target !== 'local' && target !== 'remote') {
    throw new Error(`Invalid target: "${options.target}". Supported targets are "local" or "remote".`);
  }
  const isRemote = target === 'remote';

  let url: string | undefined;

  if (isRemote) {
    url = process.env['REMOTE_DATABASE_OWNER_URL'];
    if (!url) {
      throw new Error(
        'Remote database owner URL is not configured. Set REMOTE_DATABASE_OWNER_URL to perform remote operations.'
      );
    }
  } else {
    tryLoadLocalOwnerSecret(process.env);
    url = resolveDatabaseOwnerUrl();

    if (!url) {
      throw new Error(
        'Database owner credentials (DDL) are required from a secret provider (database-secret-owner file, GSM, AWS); ' +
        'atomic runtime environment variables (.env) are strictly reserved for DML and cannot be used for migrations.'
      );
    }
  }

  const parsed = new URL(url);
  if (
    !SUPPORTED_PG_PROTOCOLS.includes(parsed.protocol as (typeof SUPPORTED_PG_PROTOCOLS)[number]) ||
    !parsed.hostname ||
    parsed.pathname.length < 2
  ) {
    throw new Error('Invalid database connection parameters.');
  }

  if (!isRemote && !isLocalHost(parsed.hostname)) {
    throw new Error(
      `Refusing connection to external host "${parsed.hostname}" with target "local". ` +
      `External hosts require explicit --target remote (and --confirm-target for write operations).`
    );
  }

  const port = parsed.port || String(SYSTEM_DEFAULTS.DEFAULT_DB_PORT);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const identity = `${parsed.hostname}:${port}/${databaseName}`;

  if (isRemote && _write) {
    const confirmTarget = options.confirmTarget?.trim();
    if (!confirmTarget) {
      throw new Error(
        `Remote write operation requires explicit confirmation. Specify --confirm-target "${identity}" to proceed.`
      );
    }
    if (confirmTarget !== identity) {
      throw new Error(
        `Target confirmation mismatch: expected "${identity}", got "${confirmTarget}".`
      );
    }
  }

  return { target, url, parsed, identity, isRemote };
}

/**
 * Creates a safety backup of the database before executing write operations or migrations.
 * Triggers automatically for remote write targets or when explicitly forced.
 */
export async function backupBeforeRemoteWrite(
  destination: ReturnType<typeof resolveDatabaseTarget>,
  force = false
) {
  if (!force && !destination.isRemote) return;
  const dbName = decodeURIComponent(destination.parsed.pathname.slice(1)) || FALLBACK_DB_NAME;
  const timestamp = formatBackupTimestamp();
  const outputPath = path.resolve(BACKUPS_DIR, `${dbName}_before-migration_${timestamp}.dump`);
  await executePgDump({
    host: destination.parsed.hostname,
    port: Number(destination.parsed.port || SYSTEM_DEFAULTS.DEFAULT_DB_PORT),
    database: dbName,
    user: decodeURIComponent(destination.parsed.username),
    password: decodeURIComponent(destination.parsed.password),
    outputPath,
    connectionUrl: destination.url,
  });
  console.log(`Safety backup created: ${outputPath}`);
}

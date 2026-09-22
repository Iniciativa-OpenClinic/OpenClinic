import pg from 'pg';
import { SYSTEM_DEFAULTS } from '../constants/system.constants.js';

const { Pool } = pg;

export interface DbConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
}

export function createPool(config: DbConfig): pg.Pool {
  return new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 20,
    idleTimeoutMillis: config.idleTimeoutMs ?? 30000,
  });
}

export async function withTransaction<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface DatabaseEnvironment {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
}

/**
 * Parses a PostgreSQL connection string into atomic database components.
 */
export function parseDatabaseUrl(url: string): Partial<DatabaseEnvironment> {
  try {
    const parsed = new URL(url);
    const user = decodeURIComponent(parsed.username || '');
    const password = decodeURIComponent(parsed.password || '');
    const host = parsed.hostname || SYSTEM_DEFAULTS.DEFAULT_DB_HOST;
    const port = parsed.port ? parseInt(parsed.port, 10) : SYSTEM_DEFAULTS.DEFAULT_DB_PORT;
    const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';
    return {
      host,
      port,
      database,
      user,
      ...(password ? { password } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Extracts and normalizes atomic database environment variables.
 * Centralized Single Source of Truth for DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS.
 * If atomic variables are not set directly, extracts them from DATABASE_URL or DATABASE_OWNER_URL.
 */
export function getDatabaseEnv(environment: Record<string, string | undefined> = process.env): DatabaseEnvironment {
  let host = environment['DB_HOST'];
  let port = environment['DB_PORT'] ? parseInt(environment['DB_PORT'], 10) : undefined;
  let database = environment['DB_NAME'];
  let user = environment['DB_USER'];
  let password = environment['DB_PASS'];

  if ((!user || !database || !password) && environment['DATABASE_URL']) {
    const fallbackUrl = environment['DATABASE_URL'];
    const parsed = parseDatabaseUrl(fallbackUrl);
    host = host || parsed.host;
    port = port ?? parsed.port;
    database = database || parsed.database;
    user = user || parsed.user;
    password = password !== undefined ? password : parsed.password;
  }

  return {
    host: host || SYSTEM_DEFAULTS.DEFAULT_DB_HOST,
    port: port ?? SYSTEM_DEFAULTS.DEFAULT_DB_PORT,
    database: database || '',
    user: user || '',
    password,
  };
}

/**
 * Synthesizes the application runtime database connection URL directly from atomic variables
 * (DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME).
 */
export function resolveDatabaseUrl(environment: Record<string, string | undefined> = process.env): string | undefined {
  const { user, password, host, port, database } = getDatabaseEnv(environment);
  if (!user || !database) {
    return undefined;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPass = password ? `:${encodeURIComponent(password)}` : '';

  return `${SYSTEM_DEFAULTS.DATABASE_PROTOCOL_PREFIX}${encodedUser}${encodedPass}@${host}:${port}/${database}`;
}

/**
 * Determines whether a database role name is categorized as DDL (Owner / Superuser) or DML (App / Runtime).
 * Standard convention: '<database>_owner' or roles ending with '_owner' or 'postgres' are DDL.
 */
export function isDdlRole(username: string, databaseName?: string): boolean {
  if (!username) return false;
  const normalized = username.toLowerCase();
  const dbSuffix = databaseName ? `${databaseName.toLowerCase()}_owner` : '';
  return normalized === 'postgres' || normalized.endsWith('_owner') || (Boolean(dbSuffix) && normalized === dbSuffix);
}

/**
 * Synthesizes the database owner connection URL for migrations and administration strictly
 * from the loaded DATABASE_OWNER_URL secret (file, GSM, AWS).
 * Atomic runtime environment variables (DB_USER, DB_PASS) are strictly reserved for DML and cannot be used for DDL.
 */
export function resolveDatabaseOwnerUrl(environment: Record<string, string | undefined> = process.env): string | undefined {
  if (!environment['DATABASE_OWNER_URL']) {
    return undefined;
  }

  const parsedOwner = parseDatabaseUrl(environment['DATABASE_OWNER_URL']);
  const host = parsedOwner.host || environment['DB_HOST'] || SYSTEM_DEFAULTS.DEFAULT_DB_HOST;
  const port = parsedOwner.port ?? (environment['DB_PORT'] ? parseInt(environment['DB_PORT'], 10) : SYSTEM_DEFAULTS.DEFAULT_DB_PORT);
  const database = environment['DB_NAME'] || parsedOwner.database || '';
  const user = parsedOwner.user;
  const password = parsedOwner.password;

  if (!user || !password || !database) {
    return undefined;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(password);

  return `${SYSTEM_DEFAULTS.DATABASE_PROTOCOL_PREFIX}${encodedUser}:${encodedPass}@${host}:${port}/${database}`;
}

export type { Pool, PoolClient } from 'pg';

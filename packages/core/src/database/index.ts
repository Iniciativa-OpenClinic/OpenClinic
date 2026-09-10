import pg from 'pg';

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

export type { Pool, PoolClient } from 'pg';

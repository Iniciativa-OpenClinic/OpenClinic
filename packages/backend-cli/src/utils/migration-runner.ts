import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import postgres from 'postgres';

export const MIGRATION_LOCK = 73190246;
export const databaseDirectory = fileURLToPath(new URL('../../../../infra/database/', import.meta.url));
export const migrationsDirectory = path.join(databaseDirectory, 'migrations');
type Connection = postgres.Sql | postgres.TransactionSql;

export function loadMigrations(folder = migrationsDirectory) {
  const journal = JSON.parse(fs.readFileSync(path.join(folder, 'meta/_journal.json'), 'utf8')) as {
    entries: { idx: number; when: number; tag: string }[];
  };
  if (!journal.entries.length) throw new Error('Migration journal is empty.');
  for (const [index, entry] of journal.entries.entries()) {
    if (entry.idx !== index || !/^\d{4}_[a-z0-9_]+$/.test(entry.tag)
      || !Number.isSafeInteger(entry.when) || entry.when <= (journal.entries[index - 1]?.when ?? 0)) {
      throw new Error('Invalid migration journal: order, timestamp or filename.');
    }
  }
  const files = fs.readdirSync(folder).filter(file => file.endsWith('.sql')).sort();
  if (JSON.stringify(files) !== JSON.stringify(journal.entries.map(entry => `${entry.tag}.sql`).sort())) {
    throw new Error('SQL files and migration journal do not match.');
  }
  return readMigrationFiles({ migrationsFolder: folder }).map((migration, index) => ({
    ...migration, tag: journal.entries[index]!.tag,
  }));
}

async function history(sql: Connection) {
  const [exists] = await sql`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`;
  return exists?.present
    ? await sql<{ hash: string; created_at: string }[]>`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id`
    : [];
}

export async function inspectMigrations(sql: Connection, folder = migrationsDirectory) {
  const migrations = loadMigrations(folder);
  const applied = await history(sql);
  for (const [index, row] of applied.entries()) {
    const migration = migrations[index];
    if (!migration || Number(row.created_at) !== migration.folderMillis || row.hash !== migration.hash) {
      throw new Error('Migration history diverges from this checkout. Applied files must never be changed or removed.');
    }
  }
  const [relations] = await sql`SELECT count(*)::int AS count FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')`;
  return { migrations, applied: applied.length, pending: migrations.slice(applied.length),
    needsBaseline: applied.length === 0 && relations!.count > 0 };
}

async function lock(sql: postgres.TransactionSql) {
  await sql`SET LOCAL lock_timeout = '5s'`;
  await sql`SET LOCAL statement_timeout = '60s'`;
  const [result] = await sql`SELECT pg_try_advisory_xact_lock(${MIGRATION_LOCK}) AS acquired`;
  if (!result?.acquired) throw new Error('Another database maintenance operation is running.');
}

async function createHistory(sql: postgres.TransactionSql) {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`REVOKE ALL ON SCHEMA drizzle FROM PUBLIC`;
  await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT NOT NULL UNIQUE
  )`;
  await sql`REVOKE ALL ON drizzle.__drizzle_migrations FROM PUBLIC`;
}

export async function migrateDatabase(url: string, folder = migrationsDirectory) {
  const client = postgres(url, { max: 1, connect_timeout: 10, onnotice: () => {} });
  try {
    return await client.begin(async sql => {
      await lock(sql);
      const state = await inspectMigrations(sql, folder);
      if (state.needsBaseline) throw new Error('Existing database has no migration history. Run db:baseline --check first.');
      if (!state.pending.length) return [] as string[];
      await createHistory(sql);
      for (const migration of state.pending) {
        for (const statement of migration.sql) {
          if (statement.trim()) await sql.unsafe(statement);
        }
        await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES (${migration.hash}, ${migration.folderMillis})`;
      }
      return state.pending.map(migration => migration.tag);
    });
  } finally { await client.end(); }
}

/** PostgreSQL deparses definitions, so formatting of source SQL is irrelevant. */
export async function schemaSignature(sql: Connection): Promise<Record<string, unknown>> {
  await sql`SET LOCAL search_path TO public, pg_catalog`;
  const relations = await sql`SELECT c.relname AS name, c.relkind AS kind, c.relrowsecurity AS rls,
    c.relforcerowsecurity AS force_rls FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','S','f') ORDER BY c.relname`;
  const columns = await sql`SELECT c.relname AS table_name, a.attname AS name,
    format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS not_null,
    pg_get_expr(d.adbin, d.adrelid) AS default_value, a.attidentity AS identity, a.attgenerated AS generated,
    co.collname AS collation FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    LEFT JOIN pg_collation co ON co.oid = a.attcollation
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY c.relname, a.attname`;
  const constraints = await sql`SELECT c.relname AS table_name, co.conname AS name,
    pg_get_constraintdef(co.oid) AS definition, co.convalidated AS validated
    FROM pg_constraint co JOIN pg_class c ON c.oid = co.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' ORDER BY c.relname, co.conname`;
  const indexes = await sql`SELECT c.relname AS table_name, i.relname AS name,
    pg_get_indexdef(x.indexrelid) AS definition, x.indisvalid AS valid, x.indisready AS ready
    FROM pg_index x JOIN pg_class c ON c.oid = x.indrelid JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' ORDER BY c.relname, i.relname`;
  const triggers = await sql`SELECT c.relname AS table_name, t.tgname AS name, pg_get_triggerdef(t.oid) AS definition
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal ORDER BY c.relname, t.tgname`;
  const policies = await sql`SELECT * FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`;
  const routines = await sql`SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS arguments
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' ORDER BY 1, 2`;
  return JSON.parse(JSON.stringify({ relations, columns, constraints, indexes, triggers, policies, routines }));
}

export function signatureDifferences(expected: Record<string, unknown>, actual: Record<string, unknown>) {
  const differences: string[] = [];
  for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    const wanted = new Set((expected[key] as unknown[] ?? []).map(row => JSON.stringify(row)));
    const found = new Set((actual[key] as unknown[] ?? []).map(row => JSON.stringify(row)));
    for (const row of wanted) if (!found.has(row)) differences.push(`${key}: missing/different ${row}`);
    for (const row of found) if (!wanted.has(row)) differences.push(`${key}: unexpected/different ${row}`);
  }
  return differences;
}


/** Adopts an unversioned database only when it exactly matches the current baseline. */
export async function baselineDatabase(url: string, apply = false) {
  const baseline = loadMigrations()[0]!;
  const expected = JSON.parse(fs.readFileSync(path.join(databaseDirectory, 'baseline-schema.json'), 'utf8')) as {
    hash: string; signature: Record<string, unknown>;
  };
  if (baseline.hash !== expected.hash) throw new Error('Baseline SQL and verification fixture differ.');
  const client = postgres(url, { max: 1, connect_timeout: 10, onnotice: () => {} });
  try {
    return await client.begin(async sql => {
      await lock(sql);
      const state = await inspectMigrations(sql);
      if (state.applied) throw new Error('Database already has a migration history. Use db:status.');
      if (apply) {
        const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
        for (const table of tables) await sql`LOCK TABLE ${sql('public')}.${sql(table.tablename)} IN SHARE ROW EXCLUSIVE MODE`;
      }
      const differences = signatureDifferences(expected.signature, await schemaSignature(sql));
      if (apply && differences.length) throw new Error(`Baseline refused: schema mismatch.\n${differences.join('\n')}`);
      if (apply) {
        await createHistory(sql);
        await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${baseline.hash}, ${baseline.folderMillis})`;
      }
      return differences;
    });
  } finally { await client.end(); }
}

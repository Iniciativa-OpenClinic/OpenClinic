import postgres from 'postgres';
import { baselineDatabase, inspectMigrations, migrateDatabase } from '../utils/migration-runner.js';
import { backupBeforeRemoteWrite, resolveDatabaseTarget, type DatabaseOptions } from '../utils/database-connection.js';

export async function dbMigrate(options: DatabaseOptions = {}): Promise<void> {
  const destination = resolveDatabaseTarget(options, true);
  console.log(`Migrations: ${destination.identity}`);
  await backupBeforeRemoteWrite(destination, !!options.backup);
  const applied = await migrateDatabase(destination.url);
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.');
}

export async function dbStatus(options: DatabaseOptions = {}): Promise<void> {
  const destination = resolveDatabaseTarget(options);
  const sql = postgres(destination.url, { max: 1, connect_timeout: 10 });
  try {
    const state = await inspectMigrations(sql);
    console.log(`Database: ${destination.identity}`);
    console.table(state.migrations.map((migration, index) => ({
      migration: migration.tag, status: index < state.applied ? 'applied' : 'pending', hash: migration.hash,
    })));
    if (state.needsBaseline) console.log('Existing unversioned database: run db:baseline --check before migrating.');
  } finally {
    await sql.end();
  }
}

export async function dbBaseline(options: DatabaseOptions = {}): Promise<void> {
  if (options.apply && options.check) throw new Error('Choose --check or --apply, not both.');
  const destination = resolveDatabaseTarget(options, !!options.apply);
  console.log(`Baseline: ${destination.identity}`);
  const differences = await baselineDatabase(destination.url, false);
  if (differences.length) throw new Error(`Baseline refused. Reconcile these differences before adoption:\n${differences.join('\n')}`);
  if (options.apply) {
    await backupBeforeRemoteWrite(destination, true);
    await baselineDatabase(destination.url, true);
    console.log('Baseline recorded. Existing rows were preserved. Run db:migrate for later migrations.');
  } else {
    console.log('Structure matches baseline. No history was written. Use --apply to adopt it.');
  }
}

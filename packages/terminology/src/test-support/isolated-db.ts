// Test-only helper. Mirrors infra/database/tests/migrations.test.ts's isolated-DB pattern
// (relative import of backend-cli's migration runner, same as that file does) so sync.ts can
// be exercised against a real, migrated, disposable database rather than mocked SQL.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { migrateDatabase } from '../../../backend-cli/src/utils/migration-runner.js';

function testDatabaseUrl(): string {
  const file = fileURLToPath(new URL('../../../../.env', import.meta.url));
  const config = { ...(fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {}), ...process.env };
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS']) {
    if (!config[key]) throw new Error('Terminology sync tests require explicit DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASS.');
  }
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(config.DB_HOST!)) throw new Error('Terminology sync tests require a loopback server.');
  if (config.DB_NAME !== 'postgres') throw new Error('Terminology sync tests require DB_NAME=postgres on a disposable server.');
  const url = new URL(`postgresql://${config.DB_HOST}:${config.DB_PORT}/postgres`);
  url.username = config.DB_USER!;
  url.password = config.DB_PASS!;
  return url.toString();
}

export async function isolatedMigratedDb<T>(run: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const adminUrl = testDatabaseUrl();
  const name = `terminology_test_${randomUUID().replaceAll('-', '')}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  await admin`CREATE DATABASE ${admin(name)} TEMPLATE template0`;
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  await migrateDatabase(url.toString());
  const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    return await run(sql);
  } finally {
    await sql.end();
    await admin`DROP DATABASE ${admin(name)} WITH (FORCE)`;
    await admin.end();
  }
}

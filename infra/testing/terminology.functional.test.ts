import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { migrateDatabase } from '../../packages/backend-cli/src/utils/migration-runner.js';
import { syncSource } from '../../packages/terminology/src/sync.js';
import type { RawConcept, SourceAdapter } from '../../packages/terminology/src/types.js';

// Behavioral oracle: docs/modulos.md "Terminologias" section and docs/conformidade-sbis.md
// ECF.17.10/ECF.17.12 — see GitHub issue #9. Direct-to-Postgres, not HTTP: terminology:sync
// is a CLI/library operation with no API surface, unlike the agenda functional tests.
function testDatabaseUrl(): string {
  const file = fileURLToPath(new URL('../../.env', import.meta.url));
  const config = { ...(fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {}), ...process.env };
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS']) {
    if (!config[key]) throw new Error('Terminology functional tests require explicit DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASS.');
  }
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(config.DB_HOST!)) throw new Error('Terminology functional tests require a loopback server.');
  if (config.DB_NAME !== 'postgres') throw new Error('Terminology functional tests require DB_NAME=postgres on a disposable server.');
  const url = new URL(`postgresql://${config.DB_HOST}:${config.DB_PORT}/postgres`);
  url.username = config.DB_USER!;
  url.password = config.DB_PASS!;
  return url.toString();
}

async function isolated(run: (sql: postgres.Sql) => Promise<void>) {
  const adminUrl = testDatabaseUrl();
  const name = `term_func_${randomUUID().replaceAll('-', '')}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  await admin`CREATE DATABASE ${admin(name)} TEMPLATE template0`;
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  await migrateDatabase(url.toString());
  const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    await run(sql);
  } finally {
    await sql.end();
    await admin`DROP DATABASE ${admin(name)} WITH (FORCE)`;
    await admin.end();
  }
}

function fixtureAdapter(concepts: RawConcept[], version = '1'): SourceAdapter {
  return {
    sourceCode: 'func-test-fixture',
    sourceName: 'Functional Test Fixture',
    sourceKind: 'FHIR_CODESYSTEM',
    fetchVersion: async () => version,
    async *fetchConcepts() {
      yield { concepts };
    },
  };
}

test('[TERM-CODE-CAPTURE] a synced concept carries sistema, código, versão, idioma and termo original', async () => {
  await isolated(async (sql) => {
    await syncSource(sql, fixtureAdapter([{ code: 'X001', displayName: 'Termo Original de Teste' }]));

    const [row] = await sql`SELECT source_code, code, version, language, display_name FROM terminology.concepts WHERE source_code = 'func-test-fixture'`;
    assert.ok(row, 'expected a synced concept row');
    assert.equal(row!.source_code, 'func-test-fixture'); // sistema
    assert.equal(row!.code, 'X001'); // código
    assert.equal(row!.version, '1'); // versão
    assert.equal(row!.language, 'pt-BR'); // idioma
    assert.equal(row!.display_name, 'Termo Original de Teste'); // termo original
  });
});

test('[TERM-DATA-INDEPENDENCE] no migration or seed file hardcodes terminology concept rows', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const files = [
    ...fs.readdirSync(path.join(root, 'infra/database/migrations')).filter((f) => f.endsWith('.sql')).map((f) => path.join(root, 'infra/database/migrations', f)),
    ...fs.readdirSync(path.join(root, 'infra/database/seeds')).map((f) => path.join(root, 'infra/database/seeds', f)),
  ];
  assert.ok(files.length > 0, 'expected migration and seed files to scan');
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /INSERT\s+INTO\s+"?terminology"?\.?"?concepts"?/i, `${path.relative(root, file)} must not hardcode terminology concept rows`);
  }
});

test('[TERM-REIMPORT-VERSIONING] re-syncing after an upstream change closes the old row and keeps it queryable', async () => {
  await isolated(async (sql) => {
    await syncSource(sql, fixtureAdapter([{ code: 'X002', displayName: 'Nome Original' }], '1'));
    const [before] = await sql`SELECT id FROM terminology.concepts WHERE source_code = 'func-test-fixture' AND code = 'X002' AND fim_vigencia IS NULL`;

    await syncSource(sql, fixtureAdapter([{ code: 'X002', displayName: 'Nome Atualizado' }], '2'));

    const [closed] = await sql`SELECT display_name, fim_vigencia FROM terminology.concepts WHERE id = ${before!.id}`;
    assert.equal(closed!.display_name, 'Nome Original', 'the old row must retain its original data, not be overwritten');
    assert.ok(closed!.fim_vigencia, 'the old row must be closed, not deleted');

    const current = await sql`SELECT id, display_name FROM terminology.concepts WHERE source_code = 'func-test-fixture' AND code = 'X002' AND fim_vigencia IS NULL`;
    assert.equal(current.length, 1);
    assert.equal(current[0]!.display_name, 'Nome Atualizado');
    assert.notEqual(current[0]!.id, before!.id);
  });
});

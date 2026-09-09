import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { baselineDatabase, inspectMigrations, loadMigrations, migrateDatabase, migrationsDirectory,
  MIGRATION_LOCK, schemaSignature, signatureDifferences, databaseDirectory } from '../../../packages/backend-cli/src/utils/migration-runner.js';
import { seedDemoDatabase } from '../../../packages/backend-cli/src/commands/db-seed.js';
import { resolveDatabaseTarget } from '../../../packages/backend-cli/src/utils/database-target.js';
import { cloneVersionedDatabase } from '../../../packages/backend-cli/src/utils/database-clone.js';
import { executePgRestore } from '../../../packages/backend-cli/src/utils/pg-runner.js';

const adminUrl = process.env['TEST_DATABASE_ADMIN_URL'];
async function isolated(run: (url: string, client: postgres.Sql) => Promise<void>) {
  if (!adminUrl) throw new Error('TEST_DATABASE_ADMIN_URL is required and must point at a disposable PostgreSQL server.');
  const url = new URL(adminUrl);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Tests only accept a loopback database server.');
  const name = `oc_test_${randomUUID().replaceAll('-', '')}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  await admin`CREATE DATABASE ${admin(name)} TEMPLATE template0`;
  url.pathname = `/${name}`;
  const client = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try { await run(url.toString(), client); }
  finally {
    await client.end();
    await admin`DROP DATABASE ${admin(name)} WITH (FORCE)`;
    await admin.end();
  }
}

test('fresh install, reference catalog and repeated migration preserve customized data', async () => {
  await isolated(async (url, sql) => {
    assert.equal((await migrateDatabase(url)).length, loadMigrations().length);
    const [tables] = await sql`SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public'`;
    assert.equal(tables!.count, 19);
    const [users] = await sql`SELECT count(*)::int AS count FROM iam_users`;
    assert.equal(users!.count, 0);
    await sql`UPDATE sys_applications SET app_name = 'Customized by testers'`;
    assert.deepEqual(await migrateDatabase(url), []);
    const [app] = await sql`SELECT app_name FROM sys_applications`;
    assert.equal(app!.app_name, 'Customized by testers');
    const actual = await sql.begin(tx => schemaSignature(tx));
    const expected = JSON.parse(fs.readFileSync(path.join(databaseDirectory, 'baseline-schema.json'), 'utf8'));
    assert.deepEqual(signatureDifferences(expected.signature, actual), []);
  });
});

test('baseline adopts existing schema without modifying rows or custom ACLs', async () => {
  await isolated(async (url, sql) => {
    for (const statement of loadMigrations()[0]!.sql) await sql.unsafe(statement);
    await sql`INSERT INTO sys_tenants (id, name, slug) VALUES ('tenant-custom', 'My clinic', 'openclinic-system')`;
    await sql`INSERT INTO iam_groups (id, name, tenant_id) VALUES ('group-custom', 'Todos os Usuários', 'tenant-custom')`;
    await sql`INSERT INTO sys_application_resources (id, item_code) VALUES ('res-custom', 'menu_profile')`;
    await sql`INSERT INTO iam_permissions (id, group_id, resource_id, effect) VALUES ('permission-custom', 'group-custom', 'res-custom', 'DENY')`;
    await assert.rejects(migrateDatabase(url), /baseline/);
    assert.deepEqual(await baselineDatabase(url), []);
    assert.equal((await inspectMigrations(sql)).applied, 0);
    assert.deepEqual(await baselineDatabase(url, true), []);
    await migrateDatabase(url);
    const [tenant] = await sql`SELECT * FROM sys_tenants WHERE id = 'tenant-custom'`;
    assert.equal(tenant!.name, 'My clinic');
    const permissions = await sql`SELECT id, effect FROM iam_permissions WHERE group_id = 'group-custom'`;
    assert.deepEqual(permissions.map(row => ({ ...row })), [{ id: 'permission-custom', effect: 'DENY' }]);
  });
});

test('baseline refuses drift and leaves no history behind', async () => {
  await isolated(async (url, sql) => {
    for (const statement of loadMigrations()[0]!.sql) await sql.unsafe(statement);
    await sql`ALTER TABLE iam_permissions DROP CONSTRAINT iam_permissions_check`;
    assert.ok((await baselineDatabase(url)).length > 0);
    await assert.rejects(baselineDatabase(url, true), /schema mismatch/);
    assert.equal((await inspectMigrations(sql)).applied, 0);
  });
});

test('known legacy transition preserves title, data and constraints; oversized values abort adoption', async () => {
  await isolated(async (url, sql) => {
    for (const migration of loadMigrations()) for (const statement of migration.sql) await sql.unsafe(statement);
    await sql`ALTER TABLE app_patients ALTER COLUMN cpf TYPE VARCHAR(14)`;
    await sql`ALTER TABLE app_practitioners ALTER COLUMN phone TYPE VARCHAR(30)`;
    await sql`ALTER TABLE sys_applications ALTER COLUMN app_name DROP NOT NULL`;
    await sql`ALTER TABLE sys_applications ADD COLUMN app_title VARCHAR(255)`;
    await sql`UPDATE sys_applications SET app_title = 'Legacy title to preserve'`;
    await sql`ALTER TABLE iam_permissions RENAME CONSTRAINT iam_permissions_check TO iam_application_permissions_check`;
    await sql`ALTER TABLE iam_permissions RENAME CONSTRAINT iam_permissions_pkey TO iam_application_permissions_pkey`;
    await sql`INSERT INTO app_patients (id, tenant_id, full_name, cpf)
      SELECT 'legacy-patient', id, 'Legacy patient', '12345678901234' FROM sys_tenants LIMIT 1`;
    await assert.rejects(baselineDatabase(url, true, true), /oversized/);
    assert.equal((await inspectMigrations(sql)).applied, 0);
    await sql`UPDATE app_patients SET cpf = '12345678909' WHERE id = 'legacy-patient'`;
    assert.deepEqual(await baselineDatabase(url, false, true), []);
    const [before] = await sql`SELECT app_title FROM sys_applications`;
    assert.equal(before!.app_title, 'Legacy title to preserve');
    await baselineDatabase(url, true, true);
    await migrateDatabase(url);
    const [after] = await sql`SELECT default_extra_settings->>'legacy_app_title' AS title FROM sys_applications`;
    assert.equal(after!.title, 'Legacy title to preserve');
    const [patient] = await sql`SELECT full_name FROM app_patients WHERE id = 'legacy-patient'`;
    assert.equal(patient!.full_name, 'Legacy patient');
  });
});

test('failed SQL rolls back data, DDL and migration history; tampering is refused', async () => {
  await isolated(async (url, sql) => {
    await migrateDatabase(url);
    const parent = path.resolve('.temp');
    fs.mkdirSync(parent, { recursive: true });
    const folder = fs.mkdtempSync(path.join(parent, 'migration-test-'));
    try {
      fs.cpSync(migrationsDirectory, folder, { recursive: true });
      const journalFile = path.join(folder, 'meta/_journal.json');
      const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8'));
      const count = journal.entries.length;
      const tag = String(count).padStart(4, '0') + '_test_failure';
      journal.entries.push({ idx: count, when: journal.entries.at(-1).when + 1, tag, breakpoints: true });
      fs.writeFileSync(journalFile, JSON.stringify(journal));
      fs.writeFileSync(path.join(folder, tag + '.sql'), "UPDATE sys_applications SET app_name = 'Must rollback';\n--> statement-breakpoint\nCREATE TABLE rollback_probe (id int);\n--> statement-breakpoint\nSELECT missing_column FROM sys_tenants;");
      await assert.rejects(migrateDatabase(url, folder), /missing_column/);
      const [row] = await sql`SELECT app_name, to_regclass('public.rollback_probe') AS probe FROM sys_applications`;
      assert.equal(row!.app_name, 'OpenClinic');
      assert.equal(row!.probe, null);
      assert.equal((await inspectMigrations(sql)).applied, count);
      fs.appendFileSync(path.join(folder, '0000_baseline.sql'), '\n-- tampered\n');
      await assert.rejects(migrateDatabase(url, folder), /history diverges/);
    } finally { fs.rmSync(folder, { recursive: true, force: true }); }
  });
});

test('concurrent maintenance is refused', async () => {
  await isolated(async (url, sql) => {
    await sql`SELECT pg_advisory_lock(${MIGRATION_LOCK})`;
    try { await assert.rejects(migrateDatabase(url), /maintenance operation/); }
    finally { await sql`SELECT pg_advisory_unlock(${MIGRATION_LOCK})`; }
  });
});

test('demo is optional, atomic and refuses populated databases', async () => {
  await isolated(async (url, sql) => {
    await migrateDatabase(url);
    await seedDemoDatabase(url);
    const [before] = await sql`SELECT count(*)::int AS count FROM iam_users`;
    assert.equal(before!.count, 6);
    await assert.rejects(seedDemoDatabase(url), /operational data/);
    const [after] = await sql`SELECT count(*)::int AS count FROM iam_users`;
    assert.equal(after!.count, before!.count);
  });
});

test('remote mutations require explicit target and runtime URL is never a fallback', () => {
  const old = { ...process.env };
  try {
    delete process.env['DATABASE_OWNER_URL'];
    process.env['DATABASE_URL'] = 'postgresql://app:secret@localhost/clinic';
    assert.throws(() => resolveDatabaseTarget(), /DATABASE_OWNER_URL/);
    process.env['DATABASE_OWNER_URL'] = 'postgresql://owner:secret@example.com/clinic';
    assert.throws(() => resolveDatabaseTarget(), /Local target/);
    process.env['REMOTE_DATABASE_OWNER_URL'] = 'postgresql://owner:secret@example.com/clinic';
    assert.throws(() => resolveDatabaseTarget({ target: 'remote' }, true), /confirm-target/);
    assert.equal(resolveDatabaseTarget({ target: 'remote', confirmTarget: 'example.com:5432/clinic' }, true).identity, 'example.com:5432/clinic');
  } finally {
    for (const key of ['DATABASE_OWNER_URL', 'DATABASE_URL', 'REMOTE_DATABASE_OWNER_URL']) {
      if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key];
    }
  }
});

test('clone restores to staging, preserves history and archives destination; invalid restore fails', { skip: !process.env['TEST_PG_CLIENT'] }, async () => {
  await isolated(async (sourceUrl, source) => {
    await migrateDatabase(sourceUrl);
    await seedDemoDatabase(sourceUrl);
    await isolated(async (targetUrl, target) => {
      await migrateDatabase(targetUrl);
      await target`UPDATE sys_applications SET app_name = 'Destination before clone'`;
      const targetName = new URL(targetUrl).pathname.slice(1);
      await target`ALTER DATABASE ${target(targetName)} CONNECTION LIMIT 12`;
      await target`REVOKE CONNECT ON DATABASE ${target(targetName)} FROM PUBLIC`;
      await target`ALTER DATABASE ${target(targetName)} SET timezone TO 'UTC'`;
      await source`INSERT INTO iam_sessions (id, user_id, token_hash, expires_at) SELECT 'session-local', id, 'do-not-copy', now() + interval '1 day' FROM iam_users LIMIT 1`;
      await source.end();
      await target.end();
      const config = (url: string) => {
        const parsed = new URL(url);
        return { host: parsed.hostname, port: Number(parsed.port), database: parsed.pathname.slice(1),
          user: parsed.username, password: parsed.password, connectionUrl: url };
      };
      await cloneVersionedDatabase(config(sourceUrl), config(targetUrl));
      const restored = postgres(targetUrl, { max: 1 });
      try {
        assert.equal((await inspectMigrations(restored)).pending.length, 0);
        const [database] = await restored`SELECT datconnlimit FROM pg_database WHERE datname = current_database()`;
        assert.equal(database!.datconnlimit, 12);
        const grants = await restored`SELECT a.privilege_type FROM pg_database d,
          LATERAL aclexplode(d.datacl) a WHERE d.datname = current_database() AND a.grantee = 0`;
        assert.ok(!grants.some(grant => grant.privilege_type === 'CONNECT'));
        const [timezone] = await restored`SHOW timezone`;
        assert.equal(timezone!.TimeZone, 'UTC');
        const [row] = await restored`SELECT count(*)::int AS count FROM iam_sessions`;
        assert.equal(row!.count, 0);
        const invalid = path.resolve('.temp', 'invalid-restore-' + randomUUID() + '.dump');
        fs.writeFileSync(invalid, 'not a PostgreSQL archive');
        try { await assert.rejects(executePgRestore({ ...config(targetUrl), inputPath: invalid }), /failed/); }
        finally { fs.unlinkSync(invalid); }
        const [app] = await restored`SELECT app_name FROM sys_applications`;
        assert.equal(app!.app_name, 'OpenClinic');
      } finally { await restored.end(); }
    });
  });
});

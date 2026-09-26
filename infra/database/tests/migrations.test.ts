import { ensureDefaultSuperAdmin } from '../../../packages/backend-cli/src/commands/user-create-admin.js';
import { BOOTSTRAP_DEFAULTS } from '@openclinic/core';
import { testDatabaseUrl } from '../test-connection.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { PostgresProcedureRepository } from '../../../packages/backend-api/src/arch/infrastructure/database/procedure.repository.js';
import { baselineDatabase, inspectMigrations, loadMigrations, migrateDatabase, migrationsDirectory,
  MIGRATION_LOCK, schemaSignature, signatureDifferences, databaseDirectory } from '../../../packages/backend-cli/src/utils/migration-runner.js';
import { seedDemoDatabase } from '../../../packages/backend-cli/src/commands/db-seed.js';
import { resolveDatabaseTarget } from '../../../packages/backend-cli/src/utils/database-connection.js';
import { cloneVersionedDatabase } from '../../../packages/backend-cli/src/utils/database-clone.js';
import { executePgRestore } from '../../../packages/backend-cli/src/utils/pg-runner.js';

const adminUrl = testDatabaseUrl();
async function isolated(run: (url: string, client: postgres.Sql) => Promise<void>) {
  const url = new URL(adminUrl);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Tests only accept a loopback database server.');
  const name = `db_test_${randomUUID().replaceAll('-', '')}`;
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
    assert.equal(tables!.count, 21);
    const [users] = await sql`SELECT count(*)::int AS count FROM iam_users`;
    assert.equal(users!.count, 0);
    const [bindings] = await sql`SELECT count(*)::int AS count FROM iam_groups g JOIN sys_tenants t ON t.id = g.tenant_id WHERE t.slug = 'acme-organization'`;
    assert.equal(bindings!.count, 6);
    const [unbound] = await sql`SELECT count(*)::int AS count FROM iam_permissions WHERE tenant_id IS NULL`;
    assert.equal(unbound!.count, 0);
    await sql`UPDATE sys_applications SET app_name = 'Customized by testers'`;
    assert.deepEqual(await migrateDatabase(url), []);
    const [app] = await sql`SELECT app_name FROM sys_applications`;
    assert.equal(app!.app_name, 'Customized by testers');
  });
});

test('original baseline still matches its immutable schema signature', async () => {
  await isolated(async (_url, sql) => {
    for (const statement of loadMigrations()[0]!.sql) await sql.unsafe(statement);
    const actual = await sql.begin(tx => schemaSignature(tx));
    const expected = JSON.parse(fs.readFileSync(path.join(databaseDirectory, 'baseline-schema.json'), 'utf8'));
    assert.deepEqual(signatureDifferences(expected.signature, actual), []);
  });
});

test('procedure catalog persists relationships atomically and isolates tenants', async () => {
  await isolated(async (_url, sql) => {
    await migrateDatabase(_url);
    await sql`INSERT INTO sys_tenants (id, name) VALUES ('procedure-tenant-a', 'A'), ('procedure-tenant-b', 'B')`;
    await sql`INSERT INTO app_practitioners (id, tenant_id, full_name, practitioner_type) VALUES
      ('professional-a', 'procedure-tenant-a', 'A', 'CLINICAL'),
      ('professional-b', 'procedure-tenant-b', 'B', 'CLINICAL'),
      ('professional-deleted', 'procedure-tenant-a', 'Deleted', 'CLINICAL')`;
    await sql`UPDATE app_practitioners SET deleted_at = now(), is_active = false WHERE id = 'professional-deleted'`;
    const repo = new PostgresProcedureRepository(drizzle(sql), 'procedure-tenant-a');
    const foreign = new PostgresProcedureRepository(drizzle(sql), 'procedure-tenant-b');
    const input = { name: 'Consulta 100%', estimated_duration_minutes: 30, requires_room: true, tuss_code: '10101012', practitioner_ids: ['professional-a'] };
    const created = await repo.create(input);
    assert.equal(created.tenant_id, 'procedure-tenant-a');
    assert.deepEqual(created.practitioner_ids, ['professional-a']);
    assert.deepEqual((await repo.getById(created.id))!.practitioner_ids, ['professional-a']);
    assert.equal(await foreign.getById(created.id), null);
    assert.equal(await foreign.update(created.id, { name: 'Forbidden' }), null);
    assert.equal(await foreign.softDelete(created.id), false);
    assert.equal((await foreign.list({ offset: 0, limit: 20 })).total, 0);
    for (const practitioner of ['professional-b', 'professional-deleted', 'missing']) {
      await assert.rejects(repo.create({ ...input, practitioner_ids: [practitioner] }), /practitioners/);
      await assert.rejects(repo.update(created.id, { name: 'Rolled back', practitioner_ids: [practitioner] }), /practitioners/);
    }
    assert.equal((await repo.list({ offset: 0, limit: 20 })).total, 1);
    assert.equal((await repo.getById(created.id))!.name, input.name);
    assert.deepEqual((await repo.getById(created.id))!.practitioner_ids, ['professional-a']);
    // Composite foreign keys also reject cross-tenant links outside the API.
    await assert.rejects(sql`INSERT INTO app_procedure_practitioners (tenant_id, procedure_id, practitioner_id)
      VALUES ('procedure-tenant-a', ${created.id}, 'professional-b')`, /foreign key/);
    await assert.rejects(sql`UPDATE app_procedures SET estimated_duration_minutes = 0 WHERE id = ${created.id}`, /check constraint/);
    await repo.create({ ...input, name: 'Outra consulta', practitioner_ids: [] });
    assert.equal((await repo.list({ offset: 0, limit: 1, q: '%' })).total, 1);
    assert.equal((await repo.list({ offset: 0, limit: 1, q: '10101012' })).total, 2);
    assert.equal((await repo.list({ offset: 1, limit: 1 })).items.length, 1);
    const inactive = await repo.update(created.id, { is_active: false, description: null });
    assert.equal(inactive!.is_active, false);
    assert.deepEqual(inactive!.practitioner_ids, ['professional-a']);
    assert.equal((await repo.list({ offset: 0, limit: 20, is_active: true })).total, 1);
    assert.equal((await repo.list({ offset: 0, limit: 20, is_active: false })).total, 1);
    await repo.update(created.id, { practitioner_ids: [], is_active: true });
    assert.deepEqual((await repo.getById(created.id))!.practitioner_ids, []);
    assert.equal(await repo.softDelete(created.id), true);
    assert.equal(await repo.getById(created.id), null);
    assert.equal(await repo.update(created.id, { is_active: true }), null);
    assert.equal(await repo.softDelete(created.id), false);
    const [stored] = await sql`SELECT is_active, deleted_at FROM app_procedures WHERE id = ${created.id}`;
    assert.equal(stored!.is_active, false);
    assert.ok(stored!.deleted_at);
  });
});

test('baseline adopts existing schema without modifying rows or custom ACLs', async () => {
  await isolated(async (url, sql) => {
    for (const statement of loadMigrations()[0]!.sql) await sql.unsafe(statement);
    await sql`INSERT INTO sys_tenants (id, name, slug) VALUES ('tenant-custom', 'My clinic', 'openclinic-system')`;
    await sql`INSERT INTO iam_groups (id, name, tenant_id) VALUES ('group-custom', 'All Users', 'tenant-custom')`;
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

test('database owner credentials are required for migrations', (t) => {
  const keys = ['DATABASE_OWNER_URL', 'DB_NAME', 'DB_USER', 'DB_PASS', 'DB_HOST', 'DB_PORT'] as const;
  const previous = { ...process.env };
  // Simulate an environment without mounted or local secrets, regardless of the checkout.
  t.mock.method(fs, 'existsSync', () => false);
  try {
    delete process.env['DATABASE_OWNER_URL'];
    Object.assign(process.env, {
      DB_NAME: 'clinic', DB_HOST: 'localhost', DB_PORT: '5432',
      DB_USER: 'clinic_app', DB_PASS: 'appsecret',
    });
    assert.throws(() => resolveDatabaseTarget(), /owner credentials/i);

    process.env['DATABASE_OWNER_URL'] = 'postgres://clinic_owner:ownersecret@localhost:5432/clinic';
    const destination = resolveDatabaseTarget();
    assert.equal(destination.identity, 'localhost:5432/clinic');
    assert.equal(destination.parsed.username, 'clinic_owner');
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
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
        const tempDir = path.resolve('.temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const invalid = path.resolve(tempDir, 'invalid-restore-' + randomUUID() + '.dump');
        fs.writeFileSync(invalid, 'not a PostgreSQL archive');
        try { await assert.rejects(executePgRestore({ ...config(targetUrl), inputPath: invalid }), /failed/); }
        finally { if (fs.existsSync(invalid)) fs.unlinkSync(invalid); }
        const [app] = await restored`SELECT app_name FROM sys_applications`;
        assert.equal(app!.app_name, 'OpenClinic');
      } finally { await restored.end(); }
    });
  });
});

test('initial OWNER has canonical identity and repeated provisioning preserves account and permissions', async () => {
  await isolated(async (url, sql) => {
    await migrateDatabase(url);
    const first = await ensureDefaultSuperAdmin(url);
    assert.equal(first.created, true);
    const [owner] = await sql`SELECT * FROM iam_users WHERE role = 'OWNER'`;
    assert.equal(owner!.username, BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_USERNAME);
    assert.equal(owner!.full_name, BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_FULL_NAME);
    assert.equal(owner!.job_title, BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_JOB_TITLE);
    assert.equal(owner!.cpf, BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_CPF);
    const memberships = await sql`SELECT * FROM iam_user_groups ORDER BY id`;
    const permissions = await sql`SELECT * FROM iam_permissions ORDER BY id`;
    assert.equal((await ensureDefaultSuperAdmin(url)).created, false);
    const [afterOwner] = await sql`SELECT * FROM iam_users WHERE role = 'OWNER'`;
    assert.deepEqual(afterOwner, owner);
    assert.deepEqual(await sql`SELECT * FROM iam_user_groups ORDER BY id`, memberships);
    assert.deepEqual(await sql`SELECT * FROM iam_permissions ORDER BY id`, permissions);
  });
});

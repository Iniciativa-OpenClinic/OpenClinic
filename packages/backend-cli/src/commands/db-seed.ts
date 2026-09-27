import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { hashPassword, BOOTSTRAP_DEFAULTS } from '@openclinic/core';
import { resolveDatabaseTarget, type DatabaseOptions } from '../utils/database-connection.js';
import { inspectMigrations, databaseDirectory, MIGRATION_LOCK } from '../utils/migration-runner.js';

interface SeedUser {
  username: string;
  email: string;
  cpf: string;
  full_name: string;
  display_name: string;
  role: string;
  job_title: string;
  is_tenant_owner: boolean;
  groups: string[];
}

interface SeedData {
  users: SeedUser[];
}

export async function dbSeed(options: DatabaseOptions = {}): Promise<void> {
  if (!options.demo) throw new Error('Reference data is versioned: run db:migrate. Demo data requires db:seed --demo on an empty local database.');
  if (options.target === 'remote') throw new Error('Demo seeding is local only. Use an explicit maintenance clone to replace the remote demo.');
  const destination = resolveDatabaseTarget(options, true);
  await seedDemoDatabase(destination.url);
}

export async function seedDemoDatabase(url: string): Promise<void> {
  const client = postgres(url, { max: 1, connect_timeout: 10 });
  try {
    await client.begin(async sql => {
      await sql`SET LOCAL lock_timeout = '5s'`;
      const [lock] = await sql`SELECT pg_try_advisory_xact_lock(${MIGRATION_LOCK}) AS acquired`;
      if (!lock?.acquired) throw new Error('Another database maintenance operation is running.');

      const state = await inspectMigrations(sql);
      if (state.pending.length || state.needsBaseline) throw new Error('Apply all migrations before demo seeding.');

      const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
      for (const table of tables) {
        await sql`LOCK TABLE ${sql('public')}.${sql(table.tablename)} IN SHARE ROW EXCLUSIVE MODE`;
        if (table.tablename.startsWith('app_') || ['iam_users', 'iam_sessions', 'iam_user_groups', 'sys_audit_logs'].includes(table.tablename)) {
          const [row] = await sql`SELECT EXISTS (SELECT 1 FROM ${sql('public')}.${sql(table.tablename)} LIMIT 1) AS populated`;
          if (row?.populated) throw new Error('Demo seed refused: database already contains operational data.');
        }
      }

      const [tenant] = await sql`SELECT id FROM sys_tenants WHERE is_default = true OR slug = ${BOOTSTRAP_DEFAULTS.DEFAULT_SYSTEM_TENANT_SLUG} LIMIT 1`;
      if (!tenant) throw new Error('Reference tenant missing.');

      const groupRows = await sql`SELECT id, name FROM iam_groups WHERE tenant_id = ${tenant.id}`;
      const groupIds: Record<string, string> = Object.fromEntries(groupRows.map(group => [group.name, group.id]));

      const seedJsonPath = path.join(databaseDirectory, 'seeds', 'initial-iam-data.json');
      if (!fs.existsSync(seedJsonPath)) {
        throw new Error(`Seed file not found: ${seedJsonPath}. Cannot proceed without initial-iam-data.json.`);
      }

      let seedData: SeedData;
      try {
        seedData = JSON.parse(fs.readFileSync(seedJsonPath, 'utf8')) as SeedData;
      } catch (err) {
        throw new Error(`Failed to parse initial-iam-data.json: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!Array.isArray(seedData.users) || seedData.users.length === 0) {
        throw new Error('initial-iam-data.json must contain a non-empty "users" array.');
      }

      const seedUserPassword = process.env['DEMO_USER_PASSWORD'] ?? BOOTSTRAP_DEFAULTS.DEV_DEFAULT_PASSWORD;
      console.log('  -> Provisioning IAM users with Argon2id password hash...');
      const defaultPasswordHash = await hashPassword(seedUserPassword);

      for (const u of seedData.users) {
        const existingUser = await sql`
          SELECT id FROM iam_users
          WHERE (username = ${u.username} OR email = ${u.email})
            AND (tenant_id = ${tenant.id} OR tenant_id IS NULL)
          LIMIT 1
        `;

        let targetUserId: string;

        if (existingUser.length > 0 && existingUser[0]?.id) {
          targetUserId = existingUser[0].id;
          await sql`
            UPDATE iam_users
            SET
              username = ${u.username},
              email = ${u.email},
              cpf = ${u.cpf},
              full_name = ${u.full_name},
              display_name = ${u.display_name},
              role = ${u.role},
              job_title = ${u.job_title},
              is_tenant_owner = ${u.is_tenant_owner},
              is_active = true,
              tenant_id = ${tenant.id},
              updated_at = NOW()
            WHERE id = ${targetUserId}
          `;
        } else {
          targetUserId = randomUUID();
          await sql`
            INSERT INTO iam_users (
              id, username, email, cpf, full_name, display_name, role, job_title,
              hashed_password, is_active, is_tenant_owner, tenant_id
            ) VALUES (
              ${targetUserId}, ${u.username}, ${u.email}, ${u.cpf}, ${u.full_name}, ${u.display_name},
              ${u.role}, ${u.job_title}, ${defaultPasswordHash}, true, ${u.is_tenant_owner}, ${tenant.id}
            )
          `;
        }

        console.log(`  [OK] User: ${u.username} (${u.role}) -> ${targetUserId}`);

        for (const grpName of u.groups) {
          const gId = groupIds[grpName];
          if (gId) {
            await sql`
              INSERT INTO iam_user_groups (id, user_id, group_id)
              VALUES (${randomUUID()}, ${targetUserId}, ${gId})
              ON CONFLICT (user_id, group_id) DO NOTHING
            `;
          }
        }
      }
    });
    console.log('IAM seed complete. All app_* tables remain empty. Run db:seed --demo with a dedicated demo fixture to populate clinical data.');
  } finally { await client.end(); }
}

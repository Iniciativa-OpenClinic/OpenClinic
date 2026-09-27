import postgres from 'postgres';
import { dbMigrate } from './db-migrate.js';
import { dbSeed } from './db-seed.js';
import { authCheck } from './auth-check.js';
import { ensureDefaultSuperAdmin } from './user-create-admin.js';
import { BOOTSTRAP_DEFAULTS } from '@openclinic/core';
import { getDatabaseConfig, type DatabaseConfig } from '../utils/database-connection.js';

async function ensureTargetDatabaseExists(config: DatabaseConfig): Promise<void> {
  const targetDb = config.database;
  if (!targetDb || targetDb === 'postgres') return;

  const candidates = [
    { username: config.ownerUser, password: config.ownerPassword },
    { username: 'postgres', password: process.env['POSTGRES_PASSWORD'] ?? 'openclinic_postgres_password' },
    { username: config.appUser, password: config.appPassword },
  ];

  for (const creds of candidates) {
    if (!creds.username) continue;
    let maintenanceSql: postgres.Sql | null = null;
    try {
      maintenanceSql = postgres({
        host: config.host,
        port: config.port,
        database: 'postgres',
        username: creds.username,
        password: creds.password,
        connect_timeout: 5,
        max: 1,
      });

      const [db] = await maintenanceSql`
        SELECT 1 FROM pg_database WHERE datname = ${targetDb}
      `;

      if (!db) {
        console.log(`Target database "${targetDb}" does not exist. Creating dynamically...`);
        const ownerRole = config.ownerUser || 'openclinic_owner';
        await maintenanceSql.unsafe(`CREATE DATABASE "${targetDb}" OWNER "${ownerRole}";`);
        if (config.appUser && config.appUser !== ownerRole) {
          await maintenanceSql.unsafe(`GRANT ALL PRIVILEGES ON DATABASE "${targetDb}" TO "${config.appUser}";`);
        }
        console.log(`✔ Database "${targetDb}" created with owner "${ownerRole}".\n`);
      }
      return;
    } catch {
      // Try next credential candidate
    } finally {
      if (maintenanceSql) {
        await maintenanceSql.end().catch(() => {});
      }
    }
  }
}

async function ensureAppTablePrivileges(config: DatabaseConfig): Promise<void> {
  const targetDb = config.database;
  const ownerRole = config.ownerUser || 'openclinic_owner';
  const appRole = config.appUser || 'openclinic_app';
  if (!appRole || appRole === ownerRole) return;

  let ownerSql: postgres.Sql | null = null;
  try {
    ownerSql = postgres({
      host: config.host,
      port: config.port,
      database: targetDb,
      username: config.ownerUser,
      password: config.ownerPassword,
      connect_timeout: 5,
      max: 1,
    });

    await ownerSql.unsafe(`
      GRANT USAGE, CREATE ON SCHEMA public TO "${appRole}";
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${appRole}";
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${appRole}";
      ALTER DEFAULT PRIVILEGES FOR ROLE "${ownerRole}" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${appRole}";
      ALTER DEFAULT PRIVILEGES FOR ROLE "${ownerRole}" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${appRole}";
    `);
  } catch {
    // Non-blocking fallback
  } finally {
    if (ownerSql) {
      await ownerSql.end().catch(() => {});
    }
  }
}

export async function dbSetup(options: { demo?: boolean } = {}): Promise<void> {
  const config = getDatabaseConfig();
  const targetDb = config.database || 'default';

  console.log('============================================================');
  console.log(`  Automated Local Database Provisioning [${targetDb}]`);
  console.log('  (Cross-platform Execution: Node.js / TypeScript)          ');
  console.log('============================================================\n');

  try {
    await ensureTargetDatabaseExists(config);

    console.log('[1/3] Applying migrations and reference catalog...');
    await dbMigrate();
    await ensureAppTablePrivileges(config);

    if (options.demo) {
      console.log('Loading full demonstration catalog...');
      await dbSeed({ demo: true });
    } else {
      console.log('Ensuring initial superadministrator (OWNER role)...');
      const superAdminResult = await ensureDefaultSuperAdmin();
      const formattedCpf = BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_CPF_FORMATTED;
      if (superAdminResult.created) {
        console.log(`  -> Superadministrator created successfully: ${superAdminResult.username} (CPF: ${formattedCpf}, role: OWNER)`);
      } else {
        console.log(`  -> Superadministrator verified: ${superAdminResult.username} (CPF: ${formattedCpf}, role: OWNER)`);
      }
    }

    console.log('\n[2/3] Validating hashing integrity and JWT signing...');
    await authCheck();

    console.log('\n[3/3] Credentials and Access Summary:');
    console.log('  Role:        OWNER (Superadministrator)');
    console.log(`  Username:    ${BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_USERNAME}`);
    console.log(`  CPF:         ${BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_CPF_FORMATTED} (ou ${BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_CPF})`);
    console.log(`  Password:    ${BOOTSTRAP_DEFAULTS.DEV_DEFAULT_PASSWORD}`);
    console.log('  Dashboard:   http://localhost:5173 (Dev) or http://localhost (Docker)');

    console.log('\n============================================================');
    console.log('  Database provisioned and configured successfully!         ');
    console.log('============================================================\n');
    console.log('To start the development environment:');
    console.log('  Terminal 1: npm run dev:api');
    console.log('  Terminal 2: npm run dev:webapp\n');
  } catch (error) {
    console.error('\n❌ [CRITICAL ERROR] Failed to provision database:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

import inquirer from 'inquirer';
import postgres from 'postgres';
import { getDatabaseConfig } from '../utils/database-connection.js';

export interface DbInitOptions {
  nonInteractive?: boolean;
  target?: 'local' | 'remote';
  superuser?: string;
  superuserPassword?: string;
  ownerUser?: string;
  ownerPassword?: string;
  appUser?: string;
  appPassword?: string;
  host?: string;
  port?: number;
  database?: string;
}

export async function dbInit(options?: DbInitOptions): Promise<void> {
  const config = getDatabaseConfig();
  const targetDb = options?.database || config.database;

  if (!targetDb) {
    throw new Error('Database name is required. Configure DB_NAME in .env or pass --database <name>.');
  }

  const defaultOwnerName = `${targetDb}_owner`;
  const defaultAppName = config.appUser || `${targetDb}_app`;

  console.log('============================================================');
  console.log('  Database CLI - Initialization & Provisioning              ');
  console.log(`  (Database: "${targetDb}", Roles and DDL Permissions)       `);
  console.log('============================================================\n');

  let superuserUrl = process.env['PG_SUPERUSER_URL'] ?? process.env['DATABASE_SUPERUSER_URL'];
  let roleOwnerUser = options?.ownerUser || config.ownerUser || defaultOwnerName;
  let roleOwnerPassword = options?.ownerPassword || config.ownerPassword;
  let roleAppUser = options?.appUser || config.appUser || defaultAppName;
  let roleAppPassword = options?.appPassword || config.appPassword;

  if (!superuserUrl && !options?.nonInteractive) {
    let destination = options?.target;
    if (!destination) {
      const answer = await inquirer.prompt<{ destination: 'remote' | 'local' }>([
        {
          type: 'list',
          name: 'destination',
          message: 'Select provisioning destination (db:init):',
          choices: [
            { name: '1. Remote Cloud Server (Remote PostgreSQL)', value: 'remote' },
            { name: `2. Local Database (Docker / localhost:${config.port})`, value: 'local' },
          ],
          default: 'remote',
        },
      ]);
      destination = answer.destination;
    }

    if (destination === 'local') {
      let localSuperUser = options?.superuser;
      if (!localSuperUser) {
        const superPrompt = await inquirer.prompt<{ superUser: string }>([
          {
            type: 'input',
            name: 'superUser',
            message: 'Administrative superuser for local PostgreSQL:',
            default: 'postgres',
            validate: (v: string) => v.trim().length > 0 || 'Superuser is required.',
          },
        ]);
        localSuperUser = superPrompt.superUser.trim();
      }

      let localSuperPass = options?.superuserPassword;
      if (!localSuperPass) {
        const passPrompt = await inquirer.prompt<{ pass: string }>([
          {
            type: 'password',
            name: 'pass',
            message: `Password for superuser (${localSuperUser}):`,
            mask: '*',
            validate: (v: string) => v.length > 0 || 'Password is required.',
          },
        ]);
        localSuperPass = passPrompt.pass;
      }

      if (!options?.ownerUser) {
        const ownerNamePrompt = await inquirer.prompt<{ ownerUser: string }>([
          {
            type: 'input',
            name: 'ownerUser',
            message: 'Owner role name to be managed (DDL):',
            default: defaultOwnerName,
            validate: (v: string) => v.trim().length > 0 || 'Owner role name is required.',
          },
        ]);
        roleOwnerUser = ownerNamePrompt.ownerUser.trim();
      }

      if (!roleOwnerPassword) {
        const ownerPassPrompt = await inquirer.prompt<{ pass: string }>([
          {
            type: 'password',
            name: 'pass',
            message: `Password for owner role (${roleOwnerUser}):`,
            mask: '*',
            validate: (v: string) => v.length > 0 || 'Password is required.',
          },
        ]);
        roleOwnerPassword = ownerPassPrompt.pass;
      }

      if (!options?.appUser) {
        const appUserPrompt = await inquirer.prompt<{ appUser: string }>([
          {
            type: 'input',
            name: 'appUser',
            message: 'Application runtime role name (DML):',
            default: defaultAppName,
            validate: (v: string) => v.trim().length > 0 || 'Application role name is required.',
          },
        ]);
        roleAppUser = appUserPrompt.appUser.trim();
      }

      if (!roleAppPassword) {
        const appPrompt = await inquirer.prompt<{ pass: string }>([
          {
            type: 'password',
            name: 'pass',
            message: `Password for application runtime role (${roleAppUser}):`,
            mask: '*',
            validate: (v: string) => v.length > 0 || 'Password is required.',
          },
        ]);
        roleAppPassword = appPrompt.pass;
      }

      const host = options?.host || config.host;
      const port = options?.port || config.port;
      superuserUrl = `postgresql://${encodeURIComponent(localSuperUser)}:${encodeURIComponent(localSuperPass)}@${host}:${port}/postgres`;
    } else {
      console.log('\nEnter remote PostgreSQL superuser connection details:');
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'host',
          message: 'Remote server host / IP:',
          default: options?.host || process.env['REMOTE_DB_HOST'] || '',
          validate: (v: string) => v.trim().length > 0 || 'Host is required.',
        },
        {
          type: 'input',
          name: 'port',
          message: 'PostgreSQL port:',
          default: String(options?.port || config.port),
          validate: (v: string) => !isNaN(parseInt(v, 10)) || 'Invalid port.',
        },
        {
          type: 'input',
          name: 'adminDatabase',
          message: 'Administrative database for initial connection:',
          default: targetDb,
          validate: (v: string) => v.trim().length > 0 || 'Administrative database is required.',
        },
        {
          type: 'input',
          name: 'username',
          message: 'Administrative superuser:',
          default: options?.superuser,
          validate: (v: string) => v.trim().length > 0 || 'Superuser is required.',
        },
        {
          type: 'password',
          name: 'password',
          message: 'Superuser password:',
          mask: '*',
          validate: (v: string) => v.length > 0 || 'Password is required.',
        },
        {
          type: 'input',
          name: 'ownerUser',
          message: 'Owner role name (DDL):',
          default: roleOwnerUser || defaultOwnerName,
          validate: (v: string) => v.trim().length > 0 || 'Owner role name is required.',
        },
        {
          type: 'password',
          name: 'ownerPassword',
          message: 'Password for owner role:',
          mask: '*',
          validate: (v: string) => v.length > 0 || 'Password is required.',
        },
        {
          type: 'input',
          name: 'appUser',
          message: 'Runtime role name (DML):',
          default: roleAppUser || defaultAppName,
          validate: (v: string) => v.trim().length > 0 || 'Runtime role name is required.',
        },
        {
          type: 'password',
          name: 'appPassword',
          message: 'Password for runtime role:',
          mask: '*',
          validate: (v: string) => v.length > 0 || 'Password is required.',
        },
      ]);

      roleOwnerUser = answers.ownerUser.trim();
      roleOwnerPassword = answers.ownerPassword;
      roleAppUser = answers.appUser.trim();
      roleAppPassword = answers.appPassword;
      const encodedUser = encodeURIComponent(answers.username.trim());
      const encodedPass = encodeURIComponent(answers.password);
      superuserUrl = `postgresql://${encodedUser}:${encodedPass}@${answers.host.trim()}:${answers.port.trim()}/${answers.adminDatabase.trim()}`;
    }
  }

  if (!superuserUrl) {
    throw new Error('Superuser connection details are required. Provide PG_SUPERUSER_URL or run in interactive mode.');
  }

  if (!roleOwnerPassword) {
    throw new Error('Owner password is required. Pass --owner-password or provide it in prompt.');
  }

  if (!roleAppPassword) {
    throw new Error('App password is required. Pass --app-password or provide it in prompt.');
  }

  console.log('\nConnecting to PostgreSQL as superuser for provisioning...');
  console.log('Target:', superuserUrl.replace(/:[^:@]+@/, ':****@'));

  const sqlAdmin = postgres(superuserUrl, { connect_timeout: 10, max: 1 });

  try {
    // 1. Create database if it does not exist
    console.log(`\n[1/3] Checking existence of database "${targetDb}"...`);
    const dbs = await sqlAdmin`SELECT datname FROM pg_database WHERE datname = ${targetDb}`;
    if (dbs.length === 0) {
      console.log(`  -> Creating database "${targetDb}"...`);
      await sqlAdmin.unsafe(`CREATE DATABASE "${targetDb}";`);
      console.log(`  [OK] Database "${targetDb}" created successfully.`);
    } else {
      console.log(`  [OK] Database "${targetDb}" already exists.`);
    }

    // 2. Provision server roles
    console.log(`\n[2/3] Configuring roles "${roleOwnerUser}" and "${roleAppUser}"...`);
    await sqlAdmin.unsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${roleOwnerUser}') THEN
          CREATE ROLE "${roleOwnerUser}" WITH LOGIN PASSWORD '${roleOwnerPassword}';
        ELSE
          ALTER ROLE "${roleOwnerUser}" WITH PASSWORD '${roleOwnerPassword}';
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${roleAppUser}') THEN
          CREATE ROLE "${roleAppUser}" WITH LOGIN PASSWORD '${roleAppPassword}';
        ELSE
          ALTER ROLE "${roleAppUser}" WITH PASSWORD '${roleAppPassword}';
        END IF;
      END $$;
    `);
    console.log('  [OK] Roles and global permissions applied successfully.');

    // 3. Connect directly to target database as superuser to adjust public schema and ownership
    console.log('\n[3/3] Adjusting public schema permissions and ownerships...');
    const targetSuperUrl = superuserUrl.replace(/\/[^/?]+(\?.*)?$/, `/${targetDb}$1`);
    const sqlTargetAdmin = postgres(targetSuperUrl, { connect_timeout: 10, max: 1 });
    try {
      await sqlTargetAdmin.unsafe(`
        ALTER DATABASE "${targetDb}" OWNER TO "${roleOwnerUser}";
        GRANT ALL PRIVILEGES ON DATABASE "${targetDb}" TO "${roleOwnerUser}";
        GRANT CONNECT ON DATABASE "${targetDb}" TO "${roleAppUser}";

        GRANT ALL ON SCHEMA public TO "${roleOwnerUser}";
        GRANT USAGE ON SCHEMA public TO "${roleAppUser}";
        ALTER DEFAULT PRIVILEGES FOR ROLE "${roleOwnerUser}" IN SCHEMA public
          GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${roleAppUser}";
        ALTER DEFAULT PRIVILEGES FOR ROLE "${roleOwnerUser}" IN SCHEMA public
          GRANT USAGE, SELECT ON SEQUENCES TO "${roleAppUser}";
        DO $$
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE format('ALTER TABLE public.%I OWNER TO "${roleOwnerUser}";', r.tablename);
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO "${roleAppUser}";', r.tablename);
          END LOOP;
        END $$;
      `);
      console.log(`  [OK] Public schema permissions and ownerships on database "${targetDb}" configured successfully.`);
    } finally {
      await sqlTargetAdmin.end();
    }

    console.log('\n============================================================');
    console.log('  ✅ Initial provisioning completed successfully!');
    console.log(`     Owner: ${roleOwnerUser}`);
    console.log(`     App:   ${roleAppUser}`);
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ [ERROR] Database provisioning failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await sqlAdmin.end();
  }
}

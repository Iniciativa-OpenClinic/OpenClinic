#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { loadEnvironment } from '@openclinic/core/server';
import { dbInit } from './commands/db-init.js';
import { dbSeed } from './commands/db-seed.js';
import { dbMigrate, dbStatus, dbBaseline } from './commands/db-migrate.js';
import { dbSetup } from './commands/db-setup.js';
import { dbBackup } from './commands/db-backup.js';
import { dbRestore } from './commands/db-restore.js';
import { userCreateAdmin } from './commands/user-create-admin.js';
import { userResetPassword } from './commands/user-reset-password.js';
import { authCheck } from './commands/auth-check.js';
import { dbSyncRemote } from './commands/db-sync-remote.js';



interface CliPackageManifest {
  name?: string;
  version?: string;
  description?: string;
  bin?: Record<string, string>;
}

function loadCliManifest(): { name: string; description: string; version: string } {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as CliPackageManifest;
  const name = pkg.bin ? Object.keys(pkg.bin)[0] : undefined;
  if (!name || typeof pkg.description !== 'string' || !pkg.description.trim()
    || typeof pkg.version !== 'string' || !pkg.version.trim()) {
    throw new Error('CLI package.json must define a bin name, description and version.');
  }
  return { name, description: pkg.description, version: pkg.version };
}

const cliManifest = loadCliManifest();

const program = new Command();
program.hook('preAction', () => { loadEnvironment(); });

program
  .name(cliManifest.name)
  .description(cliManifest.description)
  .version(cliManifest.version);

program
  .command('db:init')
  .description('Initializes configured database and provisions owner/app roles using PostgreSQL superuser')
  .option('--target <target>', 'Target environment: local or remote')
  .option('--superuser <user>', 'PostgreSQL administrative superuser username')
  .option('--superuser-password <password>', 'PostgreSQL administrative superuser password')
  .option('--owner-user <user>', 'Owner role name to be created/managed (DDL permissions)')
  .option('--owner-password <password>', 'Owner role password')
  .option('--app-user <user>', 'Application runtime role name (DML permissions)')
  .option('--app-password <password>', 'Application runtime role password')
  .option('--host <host>', 'PostgreSQL server host')
  .option('--port <port>', 'PostgreSQL server port')
  .option('--database <database>', 'Target database name')
  .option('--non-interactive', 'Runs in non-interactive mode using CLI parameters or env variables')
  .action((options) => dbInit(options));

program
  .command('db:migrate')
  .description('Applies pending migrations with checksum verification, advisory locks, and transactions')
  .option('--target <target>', 'Target environment: local or remote', 'local')
  .option('--confirm-target <identity>', 'Confirm host:port/database identity for remote write')
  .option('--backup', 'Creates safety backup before applying migrations (mandatory for remote)')
  .action((options) => dbMigrate(options));

program.command('db:status')
  .description('Lists applied and pending migrations without modifying the database')
  .option('--target <target>', 'Target environment: local or remote', 'local')
  .action((options) => dbStatus(options));

program.command('db:baseline')
  .description('Checks or records migration baseline on an existing database while preserving data')
  .option('--target <target>', 'Target environment: local or remote', 'local')
  .option('--check', 'Only verifies database structure (default)')
  .option('--apply', 'Registers baseline only if structure matches')
  .option('--confirm-target <identity>', 'Confirm host:port/database identity for remote write')
  .action((options) => dbBaseline(options));

program
  .command('db:seed')
  .description('Optional demonstration data load on local database with no operational data')
  .option('--demo', 'Creates mock users and demo records; rejects populated database')
  .option('--target <target>', 'Local environment only', 'local')
  .action((options) => dbSeed(options));

program
  .command('db:setup')
  .description('Applies migrations and validates local database; optional demonstration seed')
  .option('--demo', 'Includes demo mock records in clean database')
  .action((options) => dbSetup(options));

program
  .command('db:backup')
  .description('Generates full portable database backup in .dump format (local or remote)')
  .option('--source <source>', 'Source environment: local or remote')
  .option('--user <user>', 'PostgreSQL connection username for backup')
  .option('--password <password>', 'PostgreSQL user password')
  .option('--host <host>', 'Database host')
  .option('--port <port>', 'Database port')
  .option('--database <database>', 'Database name')
  .option('--output <path>', 'Output .dump file path')
  .action((options) => dbBackup(options));

program
  .command('db:restore')
  .description('Restores a .dump backup into the database (local or remote cloud)')
  .option('--file <file>', 'Path to .dump file for restoration')
  .option('--destination <destination>', 'Destination environment: local or remote')
  .option('--user <user>', 'PostgreSQL connection username for restore')
  .option('--password <password>', 'PostgreSQL user password')
  .option('--host <host>', 'Destination database host')
  .option('--port <port>', 'Destination database port')
  .option('--database <database>', 'Destination database name')
  .action((options) => dbRestore(options));

program
  .command('db:sync-remote')
  .description('Audits databases, monitors users, or clones a reviewed database to a remote target')
  .option('-m, --mode <mode>', 'Operation mode: audit, users, or clone')
  .option('-H, --remote-host <host>', 'Remote target host / IP')
  .option('-f, --force', 'Bypasses interactive confirmation prompts')
  .option('--maintenance', 'Confirms remote application is stopped for cloning')
  .option('--confirm-target <identity>', 'Confirm host:port/database identity for cloning')
  .action((options) => dbSyncRemote(options));

program
  .command('user:create-admin')
  .description('Creates superadministrator user with Argon2id hash (interactive or via --non-interactive)')
  .option('--non-interactive', 'Creates default superadministrator without interactive prompts')
  .option('--email <email>', 'Administrator email')
  .option('--username <username>', 'Administrator username')
  .option('--password <password>', 'Administrator password')
  .option('--full-name <fullName>', 'Administrator full name')
  .action((options) => userCreateAdmin(options));

program
  .command('user:reset-password')
  .description('Resets password for any registered user (interactive or via flags)')
  .option('-i, --identifier <identifier>', 'Username or email of the user')
  .option('-p, --password <password>', 'New password (min 8 characters)')
  .action((options) => userResetPassword(options));

program
  .command('auth:check')
  .description('Validates database connection, Argon2id hashing, and JWT signing/decoding')
  .action(authCheck);

program.parseAsync().catch((error: unknown) => {
  console.error('[ERROR]', error instanceof Error ? error.message : 'Operation failed.');
  process.exitCode = 1;
});

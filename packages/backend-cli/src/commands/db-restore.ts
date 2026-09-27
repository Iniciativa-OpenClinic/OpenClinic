import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { executePgRestore, testPgConnection } from '../utils/pg-runner.js';
import { getDatabaseConfig } from '../utils/database-connection.js';

export interface DbRestoreOptions {
  file?: string;
  destination?: 'local' | 'remote';
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

export async function dbRestore(options?: DbRestoreOptions): Promise<void> {
  const config = getDatabaseConfig();
  const targetDb = options?.database || config.database;

  console.log('============================================================');
  console.log('  Database Restoration Utility' + (targetDb ? ` [Target: ${targetDb}]` : ''));
  console.log('  (PostgreSQL Restore from Compressed .dump Archive)         ');
  console.log('============================================================\n');

  try {
    // 1. File Selection
    let inputPath = options?.file;
    if (!inputPath) {
      const backupDir = path.resolve('backups');
      let backupChoices: { name: string; value: string }[] = [];

      if (fs.existsSync(backupDir)) {
        const files = fs
          .readdirSync(backupDir)
          .filter((f) => f.endsWith('.dump') || f.endsWith('.sql'))
          .sort()
          .reverse();

        backupChoices = files.map((f) => {
          const stats = fs.statSync(path.join(backupDir, f));
          const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
          const dateStr = stats.mtime.toISOString().replace('T', ' ').slice(0, 19);
          return {
            name: `${f} (${sizeMb} MB - ${dateStr})`,
            value: path.join(backupDir, f),
          };
        });
      }

      backupChoices.push({ name: 'Enter another path manually...', value: '__custom__' });

      const { selectedBackup } = await inquirer.prompt<{ selectedBackup: string }>([
        {
          type: 'list',
          name: 'selectedBackup',
          message: 'Select backup archive to restore:',
          choices: backupChoices,
        },
      ]);

      if (selectedBackup === '__custom__') {
        const customAnswer = await inquirer.prompt<{ customPath: string }>([
          {
            type: 'input',
            name: 'customPath',
            message: 'Enter path to .dump file:',
            validate: (p: string) => fs.existsSync(p.trim()) || 'File not found at specified path.',
          },
        ]);
        inputPath = customAnswer.customPath.trim();
      } else {
        inputPath = selectedBackup;
      }
    }

    if (!inputPath || !fs.existsSync(inputPath)) {
      throw new Error(`Backup file not found: ${inputPath}`);
    }

    console.log(`\nSelected archive: ${path.resolve(inputPath)}`);

    // 2. Destination
    const config = getDatabaseConfig();

    let destination = options?.destination;
    if (!destination) {
      const answer = await inquirer.prompt<{ destination: 'remote' | 'local' }>([
        {
          type: 'list',
          name: 'destination',
          message: 'Select restore destination:',
          choices: [
            { name: '1. Remote Cloud Server (Production or Staging Host / IP)', value: 'remote' },
            { name: `2. Local Database (Docker / localhost:${config.port})`, value: 'local' },
          ],
          default: 'remote',
        },
      ]);
      destination = answer.destination;
    }

    let host = options?.host || config.host;
    let port = options?.port || config.port;
    let database = options?.database || config.database;
    let user = options?.user;
    let password = options?.password;
    const isLocal = destination === 'local';

    if (isLocal) {
      if (!user) {
        const userPrompt = await inquirer.prompt<{ user: string }>([
          {
            type: 'input',
            name: 'user',
            message: 'PostgreSQL username for restore:',
            default: config.ownerUser || config.appUser || undefined,
            validate: (v: string) => v.trim().length > 0 || 'Username is required.',
          },
        ]);
        user = userPrompt.user.trim();
      }

      if (!password) {
        const defaultPass = (user === config.appUser ? config.appPassword : config.ownerPassword) || undefined;
        if (!defaultPass) {
          const passAnswer = await inquirer.prompt<{ password: string }>([
            {
              type: 'password',
              name: 'password',
              message: `Password for user ${user}:`,
              mask: '*',
              validate: (v: string) => v.length > 0 || 'Password is required.',
            },
          ]);
          password = passAnswer.password;
        } else {
          password = defaultPass;
        }
      }
    } else {
      if (!host || !user || !password) {
        console.log('\nEnter remote destination connection parameters:');
        const remoteAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'host',
            message: 'Remote server host / IP:',
            default: host || process.env['REMOTE_DB_HOST'] || '',
            validate: (v: string) => v.trim().length > 0 || 'Host is required.',
            when: !options?.host,
          },
          {
            type: 'input',
            name: 'port',
            message: 'PostgreSQL port:',
            default: String(port),
            validate: (v: string) => !isNaN(parseInt(v, 10)) || 'Invalid port.',
            when: !options?.port,
          },
          {
            type: 'input',
            name: 'database',
            message: 'Database name:',
            default: database,
            validate: (v: string) => v.trim().length > 0 || 'Database name is required.',
            when: !options?.database,
          },
          {
            type: 'input',
            name: 'user',
            message: 'Username (owner with DDL privileges):',
            default: user || config.ownerUser || undefined,
            validate: (v: string) => v.trim().length > 0 || 'User is required.',
            when: !options?.user,
          },
          {
            type: 'password',
            name: 'password',
            message: 'User password:',
            mask: '*',
            validate: (v: string) => v.length > 0 || 'Password is required.',
            when: !options?.password,
          },
        ]);

        host = (options?.host || remoteAnswers.host || '').trim();
        port = options?.port || parseInt(String(remoteAnswers.port || config.port).trim(), 10);
        database = (options?.database || remoteAnswers.database || '').trim();
        user = (options?.user || remoteAnswers.user || '').trim();
        password = options?.password || remoteAnswers.password;
      }
    }

    if (!user) throw new Error('PostgreSQL user is required.');
    if (!database) throw new Error('Database name is required.');

    // 3. Test Connectivity
    console.log(`\n[1/2] Testing connectivity to ${host}:${port}/${database}...`);
    const connTest = await testPgConnection({ host, port, database, user, password });
    if (!connTest.success) {
      console.error(`❌ [ERROR] Could not connect to database: ${connTest.error}`);
      console.log('\nTip: Make sure "npm run db:init" was executed on the server');
      console.log(`as PostgreSQL superuser to provision the database and user "${user}".`);
      process.exit(1);
    }
    console.log('  [OK] Connection established successfully.');

    // 4. Confirmation
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Proceed with database restoration into "${database}" on "${host}"?`,
        default: true,
      },
    ]);

    if (!confirm) {
      console.log('Restoration cancelled by operator.');
      return;
    }

    // 5. Execute Restore
    console.log(`\n[2/2] Restoring database "${database}"...`);
    const startTime = Date.now();
    await executePgRestore({
      host,
      port,
      database,
      user,
      password,
      inputPath,
      isLocal,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n============================================================');
    console.log('  ✅ Restoration completed successfully!');
    console.log(`  Database: ${database} (${host}:${port})`);
    console.log(`  Restored Archive: ${inputPath}`);
    console.log(`  Elapsed: ${elapsed}s`);
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ [CRITICAL ERROR] Restoration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

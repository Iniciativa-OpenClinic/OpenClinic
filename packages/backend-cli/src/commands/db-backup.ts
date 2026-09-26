import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { executePgDump, testPgConnection, formatBackupTimestamp } from '../utils/pg-runner.js';
import { getDatabaseConfig } from '../utils/database-connection.js';

export interface DbBackupOptions {
  source?: 'local' | 'remote';
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  output?: string;
}

export async function dbBackup(options?: DbBackupOptions): Promise<void> {
  const config = getDatabaseConfig();
  const targetDb = options?.database || config.database;

  console.log('============================================================');
  console.log('  Database Backup Utility' + (targetDb ? ` [Database: ${targetDb}]` : ''));
  console.log('  (PostgreSQL Dump with Compressed Custom Format -Fc)       ');
  console.log('============================================================\n');

  try {

    let source = options?.source;
    if (!source) {
      const answer = await inquirer.prompt<{ source: 'local' | 'remote' }>([
        {
          type: 'list',
          name: 'source',
          message: 'Select database source environment:',
          choices: [
            { name: `1. Local Database (Docker / localhost:${config.port})`, value: 'local' },
            { name: '2. Remote Server (Cloud / Specific Host)', value: 'remote' },
          ],
          default: 'local',
        },
      ]);
      source = answer.source;
    }

    let host = options?.host || config.host;
    let port = options?.port || config.port;
    let database = options?.database || config.database;
    let user = options?.user;
    let password = options?.password;
    const isLocal = source === 'local';

    if (isLocal) {
      if (!user) {
        const userPrompt = await inquirer.prompt<{ user: string }>([
          {
            type: 'input',
            name: 'user',
            message: 'PostgreSQL backup username:',
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
        console.log('\nEnter remote server connection settings:');
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
            message: 'User (owner or DDL-privileged role):',
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

    // 2. Output file path
    let outputPath = options?.output;
    if (!outputPath) {
      const timestamp = formatBackupTimestamp();
      const defaultFilename = `${database}_${source}_backup_${timestamp}.dump`;
      const defaultPath = path.join('backups', defaultFilename);

      const answer = await inquirer.prompt<{ outputPath: string }>([
        {
          type: 'input',
          name: 'outputPath',
          message: 'Output backup file path:',
          default: defaultPath,
          validate: (v: string) => v.trim().length > 0 || 'Output path is required.',
        },
      ]);
      outputPath = answer.outputPath.trim();
    }

    // 3. Test Connection
    console.log('\n[1/2] Testing database connectivity...');
    const connTest = await testPgConnection({ host, port, database, user, password });
    if (!connTest.success) {
      console.error(`❌ [ERROR] Could not connect to database: ${connTest.error}`);
      process.exit(1);
    }
    console.log('  [OK] Connection established successfully.');

    // 4. Execute Backup
    console.log(`\n[2/2] Generating full dump of database "${database}"...`);
    console.log(`  Output file: ${path.resolve(outputPath)}`);

    const startTime = Date.now();
    await executePgDump({
      host,
      port,
      database,
      user,
      password,
      outputPath,
      isLocal,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const stats = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;
    const sizeMb = stats ? (stats.size / (1024 * 1024)).toFixed(2) : '0';

    console.log('\n============================================================');
    console.log('  ✅ Backup completed successfully!');
    console.log(`  File: ${outputPath}`);
    console.log(`  Size: ${sizeMb} MB (${stats?.size ?? 0} bytes)`);
    console.log(`  Elapsed: ${elapsed}s`);
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ [CRITICAL ERROR] Backup execution failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dbInit } from './commands/db-init.js';
import { dbSeed } from './commands/db-seed.js';
import { dbMigrate, dbStatus, dbBaseline } from './commands/db-migrate.js';
import { dbSetup } from './commands/db-setup.js';
import { dbBackup } from './commands/db-backup.js';
import { dbRestore } from './commands/db-restore.js';
import { userCreateAdmin } from './commands/user-create-admin.js';
import { userResetPassword } from './commands/user-reset-password.js';
import { userPurge } from './commands/user-purge.js';
import { groupPurge } from './commands/group-purge.js';
import { authCheck } from './commands/auth-check.js';
import { dbSyncRemote } from './commands/db-sync-remote.js';

// Carrega .env de múltiplos caminhos candidatos (raiz do monorepo ou pasta local)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
];

for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const program = new Command();

program
  .name('openclinic')
  .description('OpenClinic CLI - Ferramentas administrativas e de banco')
  .version('0.1.0');

program
  .command('db:init')
  .description('Cria a base openclinic e os roles owner/app usando superusuario Postgres')
  .action(dbInit);


program
  .command('db:migrate')
  .description('Aplica apenas migrations pendentes, com checksum, lock e transacao')
  .option('--target <target>', 'local ou remote', 'local')
  .option('--confirm-target <identity>', 'Confirma host:porta/database para escrita remota')
  .action((options) => dbMigrate(options));

program.command('db:status')
  .description('Lista migrations aplicadas e pendentes sem alterar o banco')
  .option('--target <target>', 'local ou remote', 'local')
  .action((options) => dbStatus(options));

program.command('db:baseline')
  .description('Verifica ou registra a baseline em um banco existente, preservando dados')
  .option('--target <target>', 'local ou remote', 'local')
  .option('--check', 'Somente verifica a estrutura (padrao)')
  .option('--apply', 'Registra a baseline somente se a estrutura corresponder')
  .option('--reconcile-legacy', 'Prepara somente diferencas legadas conhecidas, sem truncar nem descartar dados')
  .option('--confirm-target <identity>', 'Confirma host:porta/database para escrita remota')
  .action((options) => dbBaseline(options));

program
  .command('db:seed')
  .description('Carga opcional de demonstracao em banco local sem dados operacionais')
  .option('--demo', 'Cria usuarios e dados ficticios; recusa banco populado')
  .option('--target <target>', 'Somente local', 'local')
  .action((options) => dbSeed(options));

program
  .command('db:setup')
  .description('Aplica migrations e valida o banco local; demonstracao opcional')
  .option('--demo', 'Inclui dados ficticios em banco sem dados operacionais')
  .action((options) => dbSetup(options));

program
  .command('db:backup')
  .description('Gera backup completo do banco de dados (local ou remoto) em formato .dump portátil')
  .action(dbBackup);

program
  .command('db:restore')
  .description('Restaura um backup .dump no banco de dados (local ou remoto na nuvem)')
  .action(dbRestore);

program
  .command('db:sync-remote')
  .description('Sincroniza, audita, monitora usuários ou redefine o banco remoto a partir do desenvolvimento')
  .option('-m, --mode <mode>', 'Modo de operação: audit, users, clone ou reset')
  .option('-H, --remote-host <host>', 'Host / IP do servidor remoto de destino')
  .option('-f, --force', 'Ignora perguntas de confirmação')
  .option('--maintenance', 'Confirma que a aplicacao remota foi pausada para clonagem')
  .option('--confirm-target <identity>', 'Confirma host:porta/database para clonagem')
  .action((options) => dbSyncRemote(options));

program
  .command('user:create-admin')
  .description('Cria um usuario superadministrador com hash Argon2id (interativo ou via --non-interactive)')
  .option('--non-interactive', 'Cria o superadministrador padrao sem prompts interativos')
  .option('--email <email>', 'Email do administrador')
  .option('--username <username>', 'Username do administrador')
  .option('--password <password>', 'Senha do administrador')
  .option('--full-name <fullName>', 'Nome completo do administrador')
  .action((options) => userCreateAdmin(options));

program
  .command('user:reset-password')
  .description('Redefine a senha de qualquer usuario cadastrado')
  .action(userResetPassword);

program
  .command('user:purge')
  .description('Expurga usuarios de teste (user.oliveira, owner.silva, admin.santos) e registros associados')
  .action(userPurge);

program
  .command('group:purge')
  .description('Expurga fisicamente os grupos legados/owner de governança de sistema/plataforma e seus vínculos')
  .action(groupPurge);

program
  .command('auth:check')
  .description('Valida conexao com o banco, hash Argon2id e assinatura/decodificacao JWT')
  .action(authCheck);

program.parseAsync().catch((error: unknown) => {
  console.error('[ERROR]', error instanceof Error ? error.message : 'Operation failed.');
  process.exitCode = 1;
});

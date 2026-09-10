import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { executePgRestore, testPgConnection } from '../utils/pg-runner.js';

export async function dbRestore(): Promise<void> {
  console.log('============================================================');
  console.log('  OpenClinic CLI - Utilitário de Restauração de Backup       ');
  console.log('  (PostgreSQL Restore com Formato Portátil Compactado -Fc)   ');
  console.log('============================================================\n');

  try {
    // 1. Identificar arquivos de backup existentes
    const backupsDir = path.resolve('backups');
    let backupChoices: { name: string; value: string }[] = [];

    if (fs.existsSync(backupsDir)) {
      const files = fs
        .readdirSync(backupsDir)
        .filter((f) => f.endsWith('.dump') || f.endsWith('.sql'))
        .sort()
        .reverse();

      backupChoices = files.map((f) => ({
        name: `${f} (${(fs.statSync(path.join(backupsDir, f)).size / (1024 * 1024)).toFixed(2)} MB)`,
        value: path.join('backups', f),
      }));
    }

    backupChoices.push({ name: 'Digitar outro caminho manualmente...', value: '__custom__' });

    let inputPath = '';
    const { selectedBackup } = await inquirer.prompt<{ selectedBackup: string }>([
      {
        type: 'list',
        name: 'selectedBackup',
        message: 'Selecione o arquivo de backup para restauração:',
        choices: backupChoices,
      },
    ]);

    if (selectedBackup === '__custom__') {
      const customAnswer = await inquirer.prompt<{ customPath: string }>([
        {
          type: 'input',
          name: 'customPath',
          message: 'Informe o caminho do arquivo .dump:',
          validate: (p: string) => fs.existsSync(p.trim()) || 'Arquivo não encontrado no caminho informado.',
        },
      ]);
      inputPath = customAnswer.customPath.trim();
    } else {
      inputPath = selectedBackup;
    }

    console.log(`\nArquivo selecionado: ${path.resolve(inputPath)}`);

    // 2. Destino da Restauração
    const { destination } = await inquirer.prompt<{ destination: 'remote' | 'local' }>([
      {
        type: 'list',
        name: 'destination',
        message: 'Selecione o destino da restauração:',
        choices: [
          { name: '1. Servidor Remoto na Nuvem (Host / IP de Produção ou Staging)', value: 'remote' },
          { name: '2. Banco Local (Docker / localhost:5432)', value: 'local' },
        ],
        default: 'remote',
      },
    ]);

    let host = 'localhost';
    let port = 5432;
    let database = 'openclinic';
    let user = 'openclinic_owner';
    let password = 'temp1234';
    const isLocal = destination === 'local';

    if (isLocal) {
      const envOwnerUrl = process.env['DATABASE_OWNER_URL'] ?? process.env['DATABASE_URL'];
      if (envOwnerUrl) {
        try {
          const parsed = new URL(envOwnerUrl);
          host = parsed.hostname || 'localhost';
          port = parsed.port ? parseInt(parsed.port, 10) : 5432;
          database = parsed.pathname.replace(/^\//, '') || 'openclinic';
          user = decodeURIComponent(parsed.username || 'openclinic_owner');
          password = decodeURIComponent(parsed.password || 'temp1234');
        } catch {
          // Mantém padrões
        }
      }
      console.log(`\nConfigurações locais detectadas:`);
      console.log(`  Host: ${host}:${port} | Base: ${database} | Usuário: ${user}\n`);
    } else {
      console.log('\nInforme os dados de conexão do servidor remoto de destino:');
      const remoteAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'host',
          message: 'Host / IP do servidor remoto:',
          validate: (v: string) => v.trim().length > 0 || 'O host é obrigatório.',
        },
        {
          type: 'input',
          name: 'port',
          message: 'Porta do PostgreSQL:',
          default: '5432',
          validate: (v: string) => !isNaN(parseInt(v, 10)) || 'Porta inválida.',
        },
        {
          type: 'input',
          name: 'database',
          message: 'Nome do banco de dados:',
          default: 'openclinic',
        },
        {
          type: 'input',
          name: 'user',
          message: 'Usuário (owner com permissões DDL):',
          default: 'openclinic_owner',
        },
        {
          type: 'password',
          name: 'password',
          message: 'Senha do usuário:',
          mask: '*',
        },
      ]);

      host = remoteAnswers.host.trim();
      port = parseInt(remoteAnswers.port.trim(), 10);
      database = remoteAnswers.database.trim();
      user = remoteAnswers.user.trim();
      password = remoteAnswers.password;
    }

    // 3. Validação prévia de conectividade
    console.log('\n[1/2] Testando conectividade com o servidor de destino...');
    const connTest = await testPgConnection({ host, port, database, user, password });
    if (!connTest.success) {
      console.error(`❌ [ERRO] Não foi possível conectar ao banco de dados: ${connTest.error}`);
      console.log('\nDica: Certifique-se de que o comando "npm run db:init" já foi executado no servidor');
      console.log('remoto como superusuário Postgres para criar a base e o usuário "openclinic_owner".');
      process.exit(1);
    }
    console.log('  [OK] Conexão com o banco remoto estabelecida com sucesso!');

    // 4. Confirmação do Usuário
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Deseja iniciar a restauração agora em "${database}" no host "${host}"?`,
        default: true,
      },
    ]);

    if (!confirm) {
      console.log('Operação cancelada pelo usuário.');
      process.exit(0);
    }

    // 5. Execução do Restore
    console.log(`\n[2/2] Executando pg_restore no banco "${database}"...`);
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
    console.log('  ✅ Restauração concluída com sucesso!');
    console.log(`  Servidor: ${host}:${port} | Base: ${database}`);
    console.log(`  Arquivo restaurado: ${inputPath}`);
    console.log(`  Tempo decorrido: ${elapsed}s`);
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ [ERRO CRÍTICO] Falha na restauração do backup:', error);
    process.exit(1);
  }
}

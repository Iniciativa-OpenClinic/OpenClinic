import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { executePgDump, testPgConnection } from '../utils/pg-runner.js';

export async function dbBackup(): Promise<void> {
  console.log('============================================================');
  console.log('  OpenClinic CLI - Utilitário de Backup do Banco de Dados    ');
  console.log('  (PostgreSQL Dump com Formato Portátil Compactado -Fc)     ');
  console.log('============================================================\n');

  try {
    // 1. Escolha da Origem
    const { source } = await inquirer.prompt<{ source: 'local' | 'remote' }>([
      {
        type: 'list',
        name: 'source',
        message: 'Selecione a origem do banco de dados:',
        choices: [
          { name: '1. Banco Local (Docker / localhost:5432)', value: 'local' },
          { name: '2. Servidor Remoto (Nuvem / Host específico)', value: 'remote' },
        ],
        default: 'local',
      },
    ]);

    let host = 'localhost';
    let port = 5432;
    let database = 'openclinic';
    let user = 'openclinic_owner';
    let password = 'temp1234';
    const isLocal = source === 'local';

    if (isLocal) {
      // Tentar ler valores do .env caso existam
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
          // Mantém valores padrão
        }
      }
      console.log(`\nConfigurações locais detectadas:`);
      console.log(`  Host: ${host}:${port} | Base: ${database} | Usuário: ${user}\n`);
    } else {
      console.log('\nInforme os dados de conexão do servidor remoto:');
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
          message: 'Usuário (owner recomendado):',
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

    // 2. Destino do arquivo
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0];
    const defaultFilename = `openclinic_${source}_backup_${timestamp}.dump`;
    const defaultPath = path.join('backups', defaultFilename);

    const { outputPath } = await inquirer.prompt<{ outputPath: string }>([
      {
        type: 'input',
        name: 'outputPath',
        message: 'Caminho do arquivo de backup de saída:',
        default: defaultPath,
      },
    ]);

    // 3. Teste de Conexão
    console.log('\n[1/2] Testando conectividade com o banco de dados...');
    const connTest = await testPgConnection({ host, port, database, user, password });
    if (!connTest.success) {
      console.error(`❌ [ERRO] Não foi possível conectar ao banco de dados: ${connTest.error}`);
      process.exit(1);
    }
    console.log('  [OK] Conexão estabelecida com sucesso!');

    // 4. Execução do Backup
    console.log(`\n[2/2] Gerando dump completo da base "${database}"...`);
    console.log(`  Arquivo de saída: ${path.resolve(outputPath)}`);

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
    console.log('  ✅ Backup concluído com sucesso!');
    console.log(`  Arquivo: ${outputPath}`);
    console.log(`  Tamanho: ${sizeMb} MB (${stats?.size ?? 0} bytes)`);
    console.log(`  Tempo decorrido: ${elapsed}s`);
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ [ERRO CRÍTICO] Falha na execução do backup:', error);
    process.exit(1);
  }
}

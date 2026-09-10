import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

export interface DbInitOptions {
  nonInteractive?: boolean;
}

export async function dbInit(options?: DbInitOptions): Promise<void> {
  console.log('============================================================');
  console.log('  OpenClinic CLI - Inicialização e Provisionamento de Banco  ');
  console.log('  (Criação de Base "openclinic", Roles e Permissões DDL)    ');
  console.log('============================================================\n');

  let superuserUrl = process.env['PG_SUPERUSER_URL'] ?? process.env['DATABASE_SUPERUSER_URL'];
  let rolePassword = 'temp1234';

  if (!superuserUrl && !options?.nonInteractive) {
    const { destination } = await inquirer.prompt<{ destination: 'remote' | 'local' }>([
      {
        type: 'list',
        name: 'destination',
        message: 'Selecione o destino para o provisionamento (db:init):',
        choices: [
          { name: '1. Servidor Remoto na Nuvem (PostgreSQL Remoto)', value: 'remote' },
          { name: '2. Banco Local (Docker / localhost:5432)', value: 'local' },
        ],
        default: 'remote',
      },
    ]);

    if (destination === 'local') {
      superuserUrl = 'postgresql://postgres:postgres@localhost:5432/postgres';
    } else {
      console.log('\nInforme os dados de superusuário do PostgreSQL remoto:');
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'host',
          message: 'Host / IP do servidor remoto:',
          default: '157.90.165.48',
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
          message: 'Database administrativo inicial:',
          default: 'postgres',
        },
        {
          type: 'input',
          name: 'username',
          message: 'Superusuário administrativo:',
          default: 'postgres',
        },
        {
          type: 'password',
          name: 'password',
          message: 'Senha do superusuário:',
          mask: '*',
          validate: (v: string) => v.length > 0 || 'A senha é obrigatória.',
        },
        {
          type: 'password',
          name: 'rolePassword',
          message: 'Senha para as roles da aplicação (openclinic_owner / openclinic_app):',
          default: 'temp1234',
          mask: '*',
        },
      ]);

      rolePassword = answers.rolePassword || 'temp1234';
      const encodedUser = encodeURIComponent(answers.username.trim());
      const encodedPass = encodeURIComponent(answers.password);
      superuserUrl = `postgresql://${encodedUser}:${encodedPass}@${answers.host.trim()}:${answers.port.trim()}/${answers.database.trim()}`;
    }
  }

  if (!superuserUrl) {
    superuserUrl = 'postgresql://postgres:postgres@localhost:5432/postgres';
  }

  console.log('\nConectando ao PostgreSQL como superusuario para provisionamento...');
  console.log('Destino:', superuserUrl.replace(/:[^:@]+@/, ':****@'));

  const sqlAdmin = postgres(superuserUrl, { connect_timeout: 10, max: 1 });

  try {
    // 1. Criar o banco de dados openclinic se nao existir
    console.log('\n[1/3] Verificando existencia da base de dados "openclinic"...');
    const dbs = await sqlAdmin`SELECT datname FROM pg_database WHERE datname = 'openclinic'`;
    if (dbs.length === 0) {
      console.log('  -> Criando base de dados "openclinic"...');
      await sqlAdmin.unsafe('CREATE DATABASE openclinic;');
      console.log('  [OK] Base "openclinic" criada com sucesso!');
    } else {
      console.log('  [OK] Base "openclinic" ja existe.');
    }

    // 2. Executar script de roles no servidor
    console.log('\n[2/3] Criando e configurando roles openclinic_owner e openclinic_app...');
    const possibleRolesPaths = [
      path.resolve(process.cwd(), 'docker/init-db/000-roles.sql'),
      path.resolve(process.cwd(), '../../docker/init-db/000-roles.sql'),
      path.resolve(process.cwd(), '../docker/init-db/000-roles.sql'),
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../docker/init-db/000-roles.sql'),
    ];

    let rolesSqlPath = '';
    for (const p of possibleRolesPaths) {
      if (fs.existsSync(p)) {
        rolesSqlPath = p;
        break;
      }
    }

    if (rolesSqlPath) {
      console.log('  Lendo script de roles:', rolesSqlPath);
      let rolesDdl = fs.readFileSync(rolesSqlPath, 'utf8');
      if (rolePassword !== 'temp1234') {
        rolesDdl = rolesDdl.replaceAll('temp1234', rolePassword);
      }
      await sqlAdmin.unsafe(rolesDdl);
      
      // Garante atualização de senha se a role já existia
      await sqlAdmin.unsafe(`
        ALTER ROLE openclinic_owner WITH PASSWORD '${rolePassword}';
        ALTER ROLE openclinic_app WITH PASSWORD '${rolePassword}';
      `);
      console.log('  [OK] Roles e permissões globais aplicados com sucesso!');
    } else {
      console.warn('  [AVISO] Arquivo docker/init-db/000-roles.sql nao encontrado. Pulando etapa de roles.');
    }

    // 3. Conectar diretamente a base openclinic como superuser para ajustar schema public e ownership
    console.log('\n[3/3] Ajustando permissões do schema public e ownerships...');
    const openclinicSuperUrl = superuserUrl.replace(/\/[^/?]+(\?.*)?$/, '/openclinic$1');
    const sqlOpenclinicAdmin = postgres(openclinicSuperUrl, { connect_timeout: 10, max: 1 });
    try {
      await sqlOpenclinicAdmin.unsafe(`
        GRANT ALL ON SCHEMA public TO openclinic_owner;
        GRANT USAGE ON SCHEMA public TO openclinic_app;
        ALTER DEFAULT PRIVILEGES FOR ROLE openclinic_owner IN SCHEMA public
          GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO openclinic_app;
        ALTER DEFAULT PRIVILEGES FOR ROLE openclinic_owner IN SCHEMA public
          GRANT USAGE, SELECT ON SEQUENCES TO openclinic_app;
        DO $$
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE format('ALTER TABLE public.%I OWNER TO openclinic_owner;', r.tablename);
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO openclinic_app;', r.tablename);
          END LOOP;
        END $$;
      `);
      console.log('  [OK] Permissoes do schema public e ownerships na base "openclinic" configurados com sucesso!');
    } finally {
      await sqlOpenclinicAdmin.end();
    }

    console.log('\n============================================================');
    console.log('  ✅ Provisionamento inicial concluído com sucesso!');
    console.log('  Próximos passos recomendados:');
    console.log('    • Subir o backup com: npm run db:restore');
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ [ERRO] Falha no provisionamento do banco:', error);
    process.exit(1);
  } finally {
    await sqlAdmin.end();
  }
}

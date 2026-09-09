import { dbMigrate } from './db-migrate.js';
import { dbSeed } from './db-seed.js';
import { authCheck } from './auth-check.js';
import { ensureDefaultSuperAdmin } from './user-create-admin.js';

export async function dbSetup(options: { demo?: boolean } = {}): Promise<void> {
  console.log('============================================================');
  console.log('  OpenClinic - Provisionamento Automatizado do Banco Local   ');
  console.log('  (Execução Multiplataforma: Node.js / TypeScript)          ');
  console.log('============================================================\n');

  try {
    console.log('[1/3] Aplicando migrations e catálogo de referência...');
    await dbMigrate();

    if (options.demo) {
      console.log('Carregando catálogo completo de demonstração...');
      await dbSeed({ demo: true });
    } else {
      console.log('Garantindo superadministrador inicial (perfil OWNER)...');
      const superAdminResult = await ensureDefaultSuperAdmin();
      if (superAdminResult.created) {
        console.log(`  -> Superadministrador criado com sucesso: ${superAdminResult.username} (perfil: OWNER, senha: temp1234)`);
      } else {
        console.log(`  -> Superadministrador já configurado: ${superAdminResult.username} (perfil: OWNER)`);
      }
    }

    console.log('\n[2/3] Validando integridade de hashing e JWT...');
    await authCheck();

    console.log('\n[3/3] Resumo de Credenciais e Acesso:');
    console.log('  Perfil:      OWNER (Superadministrador)');
    console.log('  Usuário:     superadmin (ou superadmin@openclinic.local)');
    console.log('  Senha:       temp1234');
    console.log('  Dashboard:   http://localhost:5173 (Dev) ou http://localhost (Docker)');

    console.log('\n============================================================');
    console.log('  Banco de dados provisionado e configurado com sucesso!    ');
    console.log('============================================================\n');
    console.log('Para iniciar o ambiente de desenvolvimento:');
    console.log('  Terminal 1: npm run dev:api');
    console.log('  Terminal 2: npm run dev:webapp\n');
  } catch (error) {
    console.error('\n❌ [ERRO CRÍTICO] Falha no provisionamento do banco:', error);
    process.exit(1);
  }
}

import { dbMigrate } from './db-migrate.js';
import { dbSeed } from './db-seed.js';
import { authCheck } from './auth-check.js';
import { ensureDefaultSuperAdmin } from './user-create-admin.js';


import { getDatabaseConfig } from '../utils/database-connection.js';

export async function dbSetup(options: { demo?: boolean } = {}): Promise<void> {
  const config = getDatabaseConfig();
  const targetDb = config.database || 'default';

  console.log('============================================================');
  console.log(`  Automated Local Database Provisioning [${targetDb}]`);
  console.log('  (Cross-platform Execution: Node.js / TypeScript)          ');
  console.log('============================================================\n');

  try {
    console.log('[1/3] Applying migrations and reference catalog...');
    await dbMigrate();

    if (options.demo) {
      console.log('Loading full demonstration catalog...');
      await dbSeed({ demo: true });
    } else {
      console.log('Ensuring initial superadministrator (OWNER role)...');
      const superAdminResult = await ensureDefaultSuperAdmin();
      if (superAdminResult.created) {
        console.log(`  -> Superadministrator created successfully: ${superAdminResult.username} (role: OWNER)`);
      } else {
        console.log(`  -> Superadministrator already configured: ${superAdminResult.username} (role: OWNER)`);
      }
    }

    console.log('\n[2/3] Validating hashing integrity and JWT signing...');
    await authCheck();

    console.log('\n[3/3] Credentials and Access Summary:');
    console.log('  Role:        OWNER (Superadministrator)');
    console.log('  Identity:    see the provisioning result above; existing accounts are preserved');
    console.log('  Password:    operator-defined; omitted from logs');
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

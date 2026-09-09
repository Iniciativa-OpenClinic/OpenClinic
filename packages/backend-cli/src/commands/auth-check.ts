import postgres from 'postgres';
import { hashPassword, verifyPassword, createAccessToken, decodeToken } from '@openclinic/core';
import type { JwtConfig } from '@openclinic/core';

export async function authCheck(): Promise<void> {
  console.log('Running auth integrity checks...');
  console.log('');

  // 1. Database connection
  const dbUrl = process.env['DATABASE_URL'] ?? process.env['DATABASE_OWNER_URL'];
  if (!dbUrl) {
    console.error('[FAIL] DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(dbUrl);
  try {
    const [result] = await sql`SELECT NOW() as now, current_database() as db`;
    console.log(`[OK] Database connection: ${result?.db ?? 'connected'} - Server time: ${result?.now ?? 'ok'}`);

    console.log('\n--- Usuários cadastrados no banco ---');
    const users = await sql`SELECT id, username, email, role, job_title, is_active, access_count, last_access, substring(hashed_password from 1 for 10) as hash_sample FROM iam_users`;
    console.table(users);

    console.log('\n--- Tentativas de Lockout ---');
    const lockouts = await sql`SELECT identifier, attempt_count, locked_until FROM iam_lockouts`;
    console.table(lockouts);

    console.log('\n--- Últimos logs de auditoria ---');
    const logs = await sql`SELECT user_id, username, action, status, created_at FROM sys_audit_logs ORDER BY created_at DESC LIMIT 5`;
    console.table(logs);
  } catch (error) {
    console.error('[FAIL] Database connection failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }

  // 2. Argon2id hash + verify
  const testPassword = 'test-password-12345';
  const hash = await hashPassword(testPassword);
  const verified = await verifyPassword(hash, testPassword);
  const wrongVerified = await verifyPassword(hash, 'wrong-password');

  if (verified && !wrongVerified) {
    console.log('[OK] Argon2id hash + verify: PASSED');
  } else {
    console.error('[FAIL] Argon2id verification failed');
    process.exit(1);
  }

  // 3. JWT sign + decode
  const jwtSecret = process.env['JWT_SECRET_KEY'] ?? 'test-secret-at-least-16-chars-long';
  const jwtConfig: JwtConfig = { secretKey: jwtSecret, algorithm: 'HS256', accessTokenExpireMinutes: 15 };

  const token = createAccessToken({ sub: 'test-user-id', role: 'ADMIN', email: 'test@openclinic.local' }, jwtConfig);
  const decoded = decodeToken(token, jwtConfig);

  if (decoded.sub === 'test-user-id' && decoded.role === 'ADMIN') {
    console.log('[OK] JWT sign + decode: PASSED');
  } else {
    console.error('[FAIL] JWT decode returned unexpected payload');
    process.exit(1);
  }

  console.log('');
  console.log('All checks passed!');
}

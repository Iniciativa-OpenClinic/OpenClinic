import postgres from 'postgres';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import {
  hashPassword,
  resolveDatabaseOwnerUrl,
  resolveDatabaseUrl,
  AuditAction,
  AuditResource,
  AuditStatus,
} from '@openclinic/core';

export interface UserResetPasswordOptions {
  identifier?: string;
  password?: string;
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function userResetPassword(options: UserResetPasswordOptions = {}): Promise<void> {
  const dbUrl = resolveDatabaseOwnerUrl() ?? resolveDatabaseUrl();
  if (!dbUrl) {
    console.error('[FAIL] Database connection credentials are not set (DATABASE_OWNER_URL or DB_* atomic variables)');
    process.exit(1);
  }

  const sql = postgres(dbUrl);

  try {
    console.log('=== User Password Reset ===\n');

    let identifier = options.identifier;
    if (!identifier) {
      identifier = await ask('Enter username or email: ');
    }

    if (!identifier) {
      console.error('[FAIL] Identifier was not provided.');
      process.exit(1);
    }

    const normalized = identifier.trim().toLowerCase();
    const [user] = await sql`
      SELECT id, username, email, role, full_name, tenant_id
      FROM iam_users
      WHERE username = ${identifier}
         OR email = ${identifier}
         OR LOWER(username) = ${normalized}
         OR LOWER(email) = ${normalized}
      LIMIT 1
    `;

    if (!user) {
      console.error(`[FAIL] User "${identifier}" was not found in the database.`);
      process.exit(1);
    }

    console.log(`User found: ${user.full_name} (${user.username} | ${user.email} | Role: ${user.role})`);

    let newPassword = options.password;
    if (!newPassword) {
      newPassword = await ask('Enter new password (minimum 8 characters): ');
    }

    if (!newPassword || newPassword.length < 8) {
      console.error('[FAIL] Password must contain at least 8 characters.');
      process.exit(1);
    }

    const hashedPassword = await hashPassword(newPassword);

    await sql`
      UPDATE iam_users
      SET hashed_password = ${hashedPassword}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Clear lockout attempts for the identifier
    await sql`
      UPDATE iam_lockouts
      SET attempt_count = 0, locked_until = NULL, updated_at = NOW()
      WHERE identifier = ${user.username} OR identifier = ${user.email}
    `;

    // Record immutable audit trail entry in sys_audit_logs
    const auditLogId = randomUUID();
    await sql`
      INSERT INTO sys_audit_logs (
        id, user_id, username, action, resource, status, ip_address, user_agent, details, tenant_id
      )
      VALUES (
        ${auditLogId}, ${user.id}, ${user.username}, ${AuditAction.ADMIN_RESET_PASSWORD_SUCCESS},
        ${AuditResource.IAM_USERS}, ${AuditStatus.SUCCESS}, '127.0.0.1', 'OpenClinic CLI',
        ${JSON.stringify({ resetVia: 'cli', targetUsername: user.username })}, ${user.tenant_id ?? null}
      )
    `;

    console.log(`\n[OK] Password for user "${user.username}" updated successfully.`);
    console.log('[OK] Lockout attempts cleared successfully.');
    console.log('[OK] Immutable audit log recorded in sys_audit_logs.');
  } catch (error) {
    console.error('[FAIL] Failed to reset password:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

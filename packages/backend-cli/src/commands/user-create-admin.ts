import postgres from 'postgres';
import inquirer from 'inquirer';
import { randomUUID } from 'node:crypto';
import {
  hashPassword,
  BOOTSTRAP_DEFAULTS,
  UserRole,
  AuditAction,
  AuditResource,
  AuditStatus,
} from '@openclinic/core';
import { getDatabaseConfig } from '../utils/database-connection.js';

export interface UserCreateAdminOptions {
  nonInteractive?: boolean;
  email?: string;
  username?: string;
  fullName?: string;
  password?: string;
}

export async function ensureDefaultSuperAdmin(customDbUrl?: string): Promise<{ created: boolean; username: string }> {
  const config = getDatabaseConfig();
  const sql = customDbUrl
    ? postgres(customDbUrl)
    : postgres({
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.appUser,
        password: config.appPassword,
      });

  try {
    const [existingOwner] = await sql`
      SELECT id, username FROM iam_users
      WHERE role = ${UserRole.OWNER} AND deleted_at IS NULL
      LIMIT 1
    `;

    if (existingOwner) {
      return { created: false, username: existingOwner.username };
    }

    const [defaultTenant] = await sql`
      SELECT id FROM sys_tenants
      WHERE is_default = true AND is_active = true
      LIMIT 1
    `;

    const username = BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_USERNAME;
    const email = BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_EMAIL;
    const fullName = BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_FULL_NAME;
    const defaultPassword = process.env['DEFAULT_ADMIN_PASSWORD'] ?? BOOTSTRAP_DEFAULTS.DEV_DEFAULT_PASSWORD;
    const hashedPassword = await hashPassword(defaultPassword);
    const userId = randomUUID();

    const [user] = await sql`
      INSERT INTO iam_users (
        id, email, username, full_name, display_name, hashed_password,
        role, is_active, is_tenant_owner, job_title, tenant_id
      )
      VALUES (
        ${userId}, ${email}, ${username}, ${fullName}, ${fullName}, ${hashedPassword},
        ${UserRole.OWNER}, true, true, ${BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_JOB_TITLE}, ${defaultTenant?.id ?? null}
      )
      RETURNING id, email, username
    `;

    if (user?.id) {
      const defaultGroups = await sql`
        SELECT id FROM iam_groups
        WHERE (is_default = true OR name = ${BOOTSTRAP_DEFAULTS.DEFAULT_GROUP_NAME})
          AND deleted_at IS NULL
      `;
      for (const dg of defaultGroups) {
        const userGroupId = randomUUID();
        await sql`
          INSERT INTO iam_user_groups (id, user_id, group_id)
          VALUES (${userGroupId}, ${user.id}, ${dg.id})
          ON CONFLICT (user_id, group_id) DO NOTHING
        `;
      }

      // Record immutable audit trail entry in sys_audit_logs
      const auditLogId = randomUUID();
      await sql`
        INSERT INTO sys_audit_logs (
          id, user_id, username, action, resource, status, ip_address, user_agent, details, tenant_id
        )
        VALUES (
          ${auditLogId}, ${user.id}, ${user.username}, ${AuditAction.USER_CREATED_BY_ADMIN},
          ${AuditResource.IAM_USERS}, ${AuditStatus.SUCCESS}, '127.0.0.1', 'OpenClinic CLI',
          ${JSON.stringify({ createdVia: 'cli', role: UserRole.OWNER })}, ${defaultTenant?.id ?? null}
        )
      `;
    }

    return { created: true, username: user.username };
  } finally {
    await sql.end();
  }
}

export async function userCreateAdmin(options: UserCreateAdminOptions = {}): Promise<void> {
  const config = getDatabaseConfig();

  let email = options.email;
  let username = options.username;
  let fullName = options.fullName;
  let password = options.password;

  if (options.nonInteractive) {
    email = email ?? BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_EMAIL;
    username = username ?? BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_USERNAME;
    fullName = fullName ?? BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_FULL_NAME;
    password = password ?? options.password ?? process.env['DEFAULT_ADMIN_PASSWORD'];
    if (!password) {
      console.error('Password is required in non-interactive mode. Please pass --password <password>.');
      process.exit(1);
    }
  } else {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'email', message: 'Owner email:', default: BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_EMAIL, validate: (v: string) => v.includes('@') || 'Invalid email' },
      { type: 'input', name: 'username', message: 'Owner username:', default: BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_USERNAME, validate: (v: string) => v.length >= 3 || 'Min 3 chars' },
      { type: 'input', name: 'full_name', message: 'Full name:', default: BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_FULL_NAME },
      { type: 'password', name: 'password', message: 'Password:', mask: '*', validate: (v: string) => v.length >= 8 || 'Min 8 chars' },
      { type: 'password', name: 'confirm', message: 'Confirm password:', mask: '*' },
    ]);

    if (answers.password !== answers.confirm) {
      console.error('Passwords do not match');
      process.exit(1);
    }

    email = answers.email;
    username = answers.username;
    fullName = answers.full_name;
    password = answers.password;
  }

  const sql = postgres({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.appUser,
    password: config.appPassword,
  });

  try {
    const [existing] = await sql`SELECT username FROM iam_users WHERE role = ${UserRole.OWNER} AND deleted_at IS NULL LIMIT 1`;
    if (existing) {
      console.log('An OWNER already exists; account, credentials and permissions were preserved.');
      return;
    }
    const [defaultTenant] = await sql`SELECT id FROM sys_tenants WHERE is_default = true AND is_active = true LIMIT 1`;

    const hashedPassword = await hashPassword(password!);
    const userId = randomUUID();

    const [user] = await sql`
      INSERT INTO iam_users (
        id, email, username, full_name, display_name, hashed_password,
        role, is_active, is_tenant_owner, job_title, tenant_id
      )
      VALUES (
        ${userId}, ${email!.trim().toLowerCase()}, ${username!.trim()}, ${fullName!.trim()}, ${fullName!.trim()},
        ${hashedPassword}, ${UserRole.OWNER}, true, true, ${BOOTSTRAP_DEFAULTS.DEFAULT_OWNER_JOB_TITLE}, ${defaultTenant?.id ?? null}
      )
      RETURNING id, email, username
    `;

    if (user?.id) {
      const defaultGroups = await sql`
        SELECT id FROM iam_groups
        WHERE (is_default = true OR name = ${BOOTSTRAP_DEFAULTS.DEFAULT_GROUP_NAME})
          AND deleted_at IS NULL
      `;
      for (const dg of defaultGroups) {
        const userGroupId = randomUUID();
        await sql`
          INSERT INTO iam_user_groups (id, user_id, group_id)
          VALUES (${userGroupId}, ${user.id}, ${dg.id})
          ON CONFLICT (user_id, group_id) DO NOTHING
        `;
      }

      // Record immutable audit trail entry in sys_audit_logs
      const auditLogId = randomUUID();
      await sql`
        INSERT INTO sys_audit_logs (
          id, user_id, username, action, resource, status, ip_address, user_agent, details, tenant_id
        )
        VALUES (
          ${auditLogId}, ${user.id}, ${user.username}, ${AuditAction.USER_CREATED_BY_ADMIN},
          ${AuditResource.IAM_USERS}, ${AuditStatus.SUCCESS}, '127.0.0.1', 'OpenClinic CLI',
          ${JSON.stringify({ createdVia: 'cli', role: UserRole.OWNER })}, ${defaultTenant?.id ?? null}
        )
      `;
    }

    console.log('');
    console.log(`Superadministrator user (${UserRole.OWNER}) created successfully!`);
    console.log('  ID:', user?.id);
    console.log('  Email:', user?.email);
    console.log('  Username:', user?.username);
    console.log(`  Role: ${UserRole.OWNER}`);
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

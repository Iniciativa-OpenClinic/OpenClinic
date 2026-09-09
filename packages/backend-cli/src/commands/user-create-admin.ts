import postgres from 'postgres';
import inquirer from 'inquirer';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '@openclinic/core';

export interface UserCreateAdminOptions {
  nonInteractive?: boolean;
  email?: string;
  username?: string;
  fullName?: string;
  password?: string;
}

export async function ensureDefaultSuperAdmin(customDbUrl?: string): Promise<{ created: boolean; username: string }> {
  const dbUrl = customDbUrl ?? process.env['DATABASE_OWNER_URL'] ?? process.env['DATABASE_URL'];
  if (!dbUrl) {
    throw new Error('DATABASE_URL or DATABASE_OWNER_URL is required to check superadmin.');
  }

  const sql = postgres(dbUrl);

  try {
    const [existingOwner] = await sql`
      SELECT id, username FROM iam_users 
      WHERE role = 'OWNER' AND deleted_at IS NULL 
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

    const username = 'superadmin';
    const email = 'superadmin@openclinic.local';
    const fullName = 'Superadministrador';
    const defaultPassword = 'temp1234';
    const hashedPassword = await hashPassword(defaultPassword);
    const userId = randomUUID();

    const [user] = await sql`
      INSERT INTO iam_users (
        id, email, username, full_name, display_name, hashed_password, 
        role, is_active, is_tenant_owner, job_title, tenant_id
      )
      VALUES (
        ${userId}, ${email}, ${username}, ${fullName}, ${fullName}, ${hashedPassword}, 
        'OWNER', true, true, 'Superadministrador / Proprietário', ${defaultTenant?.id ?? null}
      )
      RETURNING id, email, username
    `;

    if (user?.id) {
      const defaultGroups = await sql`
        SELECT id FROM iam_groups 
        WHERE (is_default = true OR name = 'Administração do Sistema' OR name = 'Todos os Usuários') 
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
    }

    return { created: true, username: user.username };
  } finally {
    await sql.end();
  }
}

export async function userCreateAdmin(options: UserCreateAdminOptions = {}): Promise<void> {
  const dbUrl = process.env['DATABASE_OWNER_URL'] ?? process.env['DATABASE_URL'];
  if (!dbUrl) {
    console.error('DATABASE_URL or DATABASE_OWNER_URL is required');
    process.exit(1);
  }

  let email = options.email;
  let username = options.username;
  let fullName = options.fullName;
  let password = options.password;

  if (options.nonInteractive) {
    email = email ?? 'superadmin@openclinic.local';
    username = username ?? 'superadmin';
    fullName = fullName ?? 'Superadministrador';
    password = password ?? 'temp1234';
  } else {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'email', message: 'Admin email:', default: 'superadmin@openclinic.local', validate: (v: string) => v.includes('@') || 'Invalid email' },
      { type: 'input', name: 'username', message: 'Admin username:', default: 'superadmin', validate: (v: string) => v.length >= 3 || 'Min 3 chars' },
      { type: 'input', name: 'full_name', message: 'Full name:', default: 'Superadministrador' },
      { type: 'password', name: 'password', message: 'Password:', default: 'temp1234', mask: '*', validate: (v: string) => v.length >= 8 || 'Min 8 chars' },
      { type: 'password', name: 'confirm', message: 'Confirm password:', default: 'temp1234', mask: '*' },
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

  const sql = postgres(dbUrl);

  try {
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
        ${hashedPassword}, 'OWNER', true, true, 'Superadministrador / Proprietário', ${defaultTenant?.id ?? null}
      )
      RETURNING id, email, username
    `;

    if (user?.id) {
      const defaultGroups = await sql`
        SELECT id FROM iam_groups 
        WHERE (is_default = true OR name = 'Administração do Sistema' OR name = 'Todos os Usuários') 
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
    }

    console.log('');
    console.log('Superadministrator user (OWNER) created successfully!');
    console.log('  ID:', user?.id);
    console.log('  Email:', user?.email);
    console.log('  Username:', user?.username);
    console.log('  Role: OWNER');
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

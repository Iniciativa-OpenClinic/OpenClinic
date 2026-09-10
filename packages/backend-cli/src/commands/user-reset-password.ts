import postgres from 'postgres';
import readline from 'node:readline';
import { hashPassword } from '@openclinic/core';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function userResetPassword(): Promise<void> {
  const dbUrl = process.env['DATABASE_OWNER_URL'] ?? process.env['DATABASE_URL'];
  if (!dbUrl) {
    console.error('[ERRO] DATABASE_URL ou DATABASE_OWNER_URL nao definida');
    process.exit(1);
  }

  const sql = postgres(dbUrl);

  try {
    console.log('=== Redefinição de Senha de Usuário ===\n');
    const identifier = await ask('Informe o username ou email do usuário: ');
    if (!identifier) {
      console.error('[ERRO] Identificador não informado.');
      process.exit(1);
    }

    const normalized = identifier.trim().toLowerCase();
    const [user] = await sql`
      SELECT id, username, email, role, full_name
      FROM iam_users
      WHERE username = ${identifier} 
         OR email = ${identifier} 
         OR LOWER(username) = ${normalized} 
         OR LOWER(email) = ${normalized}
      LIMIT 1
    `;

    if (!user) {
      console.error(`[ERRO] Usuário "${identifier}" não foi encontrado no banco.`);
      process.exit(1);
    }

    console.log(`Usuário encontrado: ${user.full_name} (${user.username} | ${user.email} | Perfil: ${user.role})`);
    const newPassword = await ask('Informe a nova senha (Enter para padrão "temp1234"): ') || 'temp1234';

    if (newPassword.length < 8) {
      console.error('[ERRO] A senha deve conter no mínimo 8 caracteres.');
      process.exit(1);
    }

    const hashedPassword = await hashPassword(newPassword);

    await sql`
      UPDATE iam_users
      SET hashed_password = ${hashedPassword}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Limpar tentativas de bloqueio (lockout) para o identificador
    await sql`
      UPDATE iam_lockouts
      SET attempt_count = 0, locked_until = NULL, updated_at = NOW()
      WHERE identifier = ${user.username} OR identifier = ${user.email}
    `;

    console.log(`\n[OK] Senha do usuário "${user.username}" atualizada com sucesso para "${newPassword}"!`);
    console.log('[OK] Bloqueios de tentativas (lockout) limpos com sucesso.');
  } catch (error) {
    console.error('[ERRO] Falha ao redefinir senha:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

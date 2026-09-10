import postgres from 'postgres';

export async function userPurge(): Promise<void> {
  const dbUrl = process.env['DATABASE_OWNER_URL'] ?? process.env['DATABASE_URL'];
  if (!dbUrl) {
    console.error('[ERRO] DATABASE_URL ou DATABASE_OWNER_URL nao definida');
    process.exit(1);
  }

  const sql = postgres(dbUrl);

  try {
    console.log('Iniciando expurgo dos usuarios (user.oliveira, owner.silva, admin.santos) e registros associados...');

    const targets = ['user.oliveira', 'owner.silva', 'admin.santos'];
    const targetEmails = ['user@openclinic.local', 'owner@openclinic.local', 'admin@openclinic.local'];

    // 1. Localizar os IDs dos usuários
    const foundUsers = await sql`
      SELECT id, username, email, full_name, role
      FROM iam_users
      WHERE username = ANY(${targets}) OR email = ANY(${targetEmails})
    `;

    if (foundUsers.length === 0) {
      console.log('  [AVISO] Nenhum dos usuarios alvo foi encontrado na tabela iam_users.');
    } else {
      console.log(`  -> ${foundUsers.length} usuario(s) localizado(s) para expurgo:`);
      for (const u of foundUsers) {
        console.log(`     * ID: ${u.id} | ${u.username} (${u.email}) [${u.role}] - ${u.full_name}`);
      }

      const userIds = foundUsers.map((u) => u.id);

      // 2. Remover sessoes ativas (iam_sessions)
      const deletedSessions = await sql`
        DELETE FROM iam_sessions
        WHERE user_id = ANY(${userIds})
        RETURNING id
      `;
      console.log(`  [OK] ${deletedSessions.length} sessao(oes) removida(s) de iam_sessions.`);

      // 3. Remover vinculos de grupos (iam_user_groups)
      const deletedUserGroups = await sql`
        DELETE FROM iam_user_groups
        WHERE user_id = ANY(${userIds})
        RETURNING id
      `;
      console.log(`  [OK] ${deletedUserGroups.length} vinculo(s) de grupos removido(s) de iam_user_groups.`);

      // 4. Remover permissoes diretas (iam_permissions)
      const deletedPermissions = await sql`
        DELETE FROM iam_permissions
        WHERE user_id = ANY(${userIds})
        RETURNING id
      `;
      console.log(`  [OK] ${deletedPermissions.length} permissao(oes) direta(s) removida(s) de iam_permissions.`);

      // 5. Desvincular ou expurgar colaboradores vinculados (app_practitioners)
      const updatedPractitioners = await sql`
        UPDATE app_practitioners
        SET user_id = NULL
        WHERE user_id = ANY(${userIds})
        RETURNING id
      `;
      console.log(`  [OK] ${updatedPractitioners.length} profissional(is) desvinculado(s) em app_practitioners.`);

      // 6. Remover registros de bloqueio (iam_lockouts)
      const deletedLockouts = await sql`
        DELETE FROM iam_lockouts
        WHERE identifier = ANY(${[...targets, ...targetEmails]})
        RETURNING id
      `;
      console.log(`  [OK] ${deletedLockouts.length} registro(s) de lockout removido(s) de iam_lockouts.`);

      // 7. Remover logs de auditoria vinculados aos IDs (sys_audit_logs)
      const deletedAuditLogs = await sql`
        DELETE FROM sys_audit_logs
        WHERE user_id = ANY(${userIds}) OR username = ANY(${targets})
        RETURNING id
      `;
      console.log(`  [OK] ${deletedAuditLogs.length} log(s) de auditoria removido(s) de sys_audit_logs.`);

      // 8. Expurgar os usuarios definitivamente (iam_users)
      const deletedUsers = await sql`
        DELETE FROM iam_users
        WHERE id = ANY(${userIds})
        RETURNING id, username
      `;
      console.log(`  [OK] ${deletedUsers.length} usuario(s) expurgado(s) com sucesso de iam_users!`);
    }

    console.log('Expurgo finalizado com sucesso.');
  } catch (error) {
    console.error('[ERRO] Falha ao expurgar usuarios:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

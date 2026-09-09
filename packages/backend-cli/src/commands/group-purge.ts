import postgres from 'postgres';

export async function groupPurge(): Promise<void> {
  const dbUrl = process.env['DATABASE_OWNER_URL'] ?? process.env['DATABASE_URL'];
  if (!dbUrl) {
    console.error('[ERRO] DATABASE_URL ou DATABASE_OWNER_URL nao definida');
    process.exit(1);
  }

  const sql = postgres(dbUrl);

  try {
    console.log('Iniciando expurgo físico de grupos de governança legados/owner e seus relacionamentos...');

    // Busca grupos correspondentes a "Administração da Plataforma" ou "Administração do Sistema"
    const targetNames = [
      'Administração da Plataforma',
      'Administração do Sistema',
    ];

    const targetGroups = await sql`
      SELECT id, name, description, is_default, tenant_id
      FROM iam_groups
      WHERE name = ANY(${targetNames})
         OR name ILIKE '%Administração%Plataforma%'
         OR name ILIKE '%Administração%Sistema%'
    `;

    if (targetGroups.length === 0) {
      console.log('  [AVISO] Nenhum grupo correspondente foi encontrado em iam_groups.');
    } else {
      console.log(`  -> ${targetGroups.length} grupo(s) localizado(s) para expurgo físico:`);
      for (const g of targetGroups) {
        console.log(`     * ID: ${g.id} | Nome: "${g.name}" | Descrição: "${g.description}"`);
      }

      const groupIds = targetGroups.map((g) => g.id);

      // 1. Remover associações de usuários ao grupo (iam_user_groups)
      const deletedUserGroups = await sql`
        DELETE FROM iam_user_groups
        WHERE group_id = ANY(${groupIds})
        RETURNING id, user_id, group_id
      `;
      console.log(`  [OK] ${deletedUserGroups.length} vínculo(s) de usuário removido(s) de iam_user_groups.`);

      // 2. Remover permissões ACL concedidas ao grupo (iam_permissions)
      const deletedPermissions = await sql`
        DELETE FROM iam_permissions
        WHERE group_id = ANY(${groupIds})
        RETURNING id
      `;
      console.log(`  [OK] ${deletedPermissions.length} permissão(ões) ACL removida(s) de iam_permissions.`);

      // 3. Excluir fisicamente o(s) grupo(s) (iam_groups)
      const deletedGroups = await sql`
        DELETE FROM iam_groups
        WHERE id = ANY(${groupIds})
        RETURNING id, name
      `;
      for (const dg of deletedGroups) {
        console.log(`  [OK] Grupo expurgado fisicamente: "${dg.name}" (${dg.id})`);
      }
    }

    console.log('[OK] Expurgo físico concluído com sucesso.');
  } catch (error) {
    console.error('[ERRO] Falha ao expurgar grupo:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

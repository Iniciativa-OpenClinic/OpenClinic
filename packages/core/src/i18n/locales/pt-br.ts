/**
 * Central Message Catalog - Portuguese (Brazil)
 * Single source of truth for domain errors and success responses in Portuguese.
 */

export const localePtBr = {
  // ── Authentication & Session ──
  ERR_AUTH_BRUTE_FORCE_LOCKED: 'Muitas tentativas falhas. Acesso temporariamente bloqueado por segurança.',
  ERR_AUTH_FAILED: 'Credenciais inválidas.\nVerifique seu usuário e senha.',
  ERR_AUTH_HEADER_MISSING: 'Cabeçalho de autorização ausente ou inválido.',
  ERR_AUTH_PASSWORD_CHANGE_REQUIRED: 'É necessário alterar sua senha antes de prosseguir.',
  ERR_TOKEN_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  ERR_TOKEN_INVALID: 'Token de autenticação inválido ou corrompido.',
  ERR_USER_DISABLED: 'Esta conta de usuário está desativada. Entre em contato com o administrador.',

  // ── Authorization & Access Control (RBAC) ──
  ERR_ACCESS_DENIED: 'Acesso negado.',
  ERR_CANNOT_PROMOTE_TO_OWNER: 'Administradores não podem promover usuários para o papel OWNER.',
  ERR_DEFAULT_GROUP_IMMUTABLE: 'O grupo padrão do sistema não pode ser alterado ou excluído.',
  ERR_DEFAULT_GROUP_MEMBER_IMMUTABLE: 'Usuários não podem ser desvinculados do grupo padrão do sistema.',
  ERR_FORBIDDEN: 'Você não tem permissão para acessar este recurso.',
  ERR_INCOMPATIBLE_RESOURCE_ROLE: 'Não é permitido atribuir permissão para um recurso que exige um papel superior ao do usuário.',
  ERR_INSUFFICIENT_ROLE: 'Papel de acesso insuficiente para este recurso.',
  ERR_OWNER_IMMUTABLE: 'Administradores não possuem permissão para alterar ou excluir um usuário OWNER.',
  ERR_USER_CANNOT_DEACTIVATE_SELF: 'Você não pode desativar sua própria conta de usuário.',
  ERR_USER_CANNOT_DELETE_SELF: 'Você não pode excluir sua própria conta de usuário.',

  // ── Data & Resource Operations (CRUD) ──
  ERR_ALREADY_EXISTS: 'O registro informado já existe.',
  ERR_GROUP_NOT_FOUND: 'Grupo de usuários não encontrado.',
  ERR_NOT_FOUND: 'Recurso não encontrado.',
  ERR_PASSWORD_TOO_SHORT: 'A senha deve conter no mínimo 8 caracteres.',
  ERR_REQUIRED_FIELDS_MISSING: 'Campos obrigatórios não foram preenchidos.',
  ERR_ROLE_NOT_FOUND: 'Papel de acesso não encontrado no sistema.',
  ERR_USER_NOT_FOUND: 'Usuário não encontrado.',
  ERR_VALIDATION: 'Dados inválidos fornecidos na requisição.',

  // ── System & Business Rules ──
  ERR_BUSINESS_RULE_VIOLATION: 'Violação de regra de negócio.',
  ERR_INTERNAL: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',

  // ── User & Group Validations ──
  ERR_GROUP_NAME_ALREADY_EXISTS: 'Já existe um grupo de usuários com este nome.',
  ERR_INVALID_CURRENT_PASSWORD: 'A senha atual informada está incorreta.',
  ERR_PASSWORD_MISMATCH: 'A nova senha e a confirmação não conferem.',
  ERR_USER_ALREADY_IN_GROUP: 'O usuário já é membro deste grupo.',
  ERR_USER_EMAIL_ALREADY_EXISTS: 'Este endereço de e-mail já está cadastrado.',
  ERR_USER_NOT_IN_GROUP: 'O usuário não pertence a este grupo.',
  ERR_USER_USERNAME_ALREADY_EXISTS: 'Este nome de usuário já está em uso.',

  // ── Authentication & Password Success ──
  MSG_FORGOT_PASSWORD_SENT: 'Se o e-mail existir no sistema, as instruções foram enviadas.',
  MSG_LOGOUT_SUCCESS: 'Sessão encerrada com sucesso.',
  MSG_PASSWORD_CHANGED_SUCCESS: 'Senha alterada com sucesso.',
  MSG_PASSWORD_RESET_SUCCESS: 'Senha redefinida com sucesso.',

  // ── Group Management Success ──
  MSG_GROUP_CREATED: 'Grupo de usuários criado com sucesso.',
  MSG_GROUP_DELETED: 'Grupo {name} foi excluído com sucesso.',
  MSG_GROUP_MEMBER_ADDED: 'Usuário vinculado ao grupo com sucesso.',
  MSG_GROUP_MEMBER_REMOVED: 'Usuário desvinculado do grupo com sucesso.',
  MSG_GROUP_STATUS_TOGGLED: 'Status do grupo alterado com sucesso.',
  MSG_GROUP_UPDATED: 'Grupo de usuários atualizado com sucesso.',

  // ── User Management Success ──
  MSG_USER_CREATED: 'Usuário cadastrado com sucesso.',
  MSG_USER_DELETED: 'Usuário {name} ({username}) foi excluído com sucesso.',
  MSG_USER_STATUS_TOGGLED: 'Usuário {name} {status} com sucesso.',
  MSG_USER_UNLOCKED: 'Bloqueio de tentativas de acesso desativado com sucesso.',
  MSG_USER_UPDATED: 'Dados do usuário atualizados com sucesso.',
} as const;

/**
 * Catálogo Central de Mensagens de Erro e Sucesso - Português (Brasil)
 * Ponto único da verdade para erros e mensagens do domínio OpenClinic em português.
 */

// ── Mensagens de Erro em Português ──
export const errorMessagesPtBr = {
  // Autenticação & Sessão
  ERR_AUTH_FAILED: 'Credenciais inválidas.\nVerifique seu usuário e senha.',
  ERR_USER_DISABLED: 'Esta conta de usuário está desativada. Entre em contato com o administrador.',
  ERR_TOKEN_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  ERR_TOKEN_INVALID: 'Token de autenticação inválido ou corrompido.',
  ERR_AUTH_HEADER_MISSING: 'Cabeçalho de autorização ausente ou inválido.',
  ERR_AUTH_BRUTE_FORCE_LOCKED: 'Muitas tentativas falhas. Acesso temporariamente bloqueado por segurança.',
  ERR_AUTH_PASSWORD_CHANGE_REQUIRED: 'É necessário alterar sua senha antes de prosseguir.',

  // Autorização & Permissões (RBAC)
  ERR_FORBIDDEN: 'Você não tem permissão para acessar este recurso.',
  ERR_ACCESS_DENIED: 'Acesso negado.',
  ERR_INSUFFICIENT_ROLE: 'Papel de acesso insuficiente para este recurso.',
  ERR_INCOMPATIBLE_RESOURCE_ROLE: 'Não é permitido atribuir permissão para um recurso que exige um papel superior ao do usuário.',
  ERR_OWNER_IMMUTABLE: 'Administradores não possuem permissão para alterar ou excluir um usuário OWNER.',
  ERR_CANNOT_PROMOTE_TO_OWNER: 'Administradores não podem promover usuários para o papel OWNER.',
  ERR_USER_CANNOT_DEACTIVATE_SELF: 'Você não pode desativar sua própria conta de usuário.',
  ERR_USER_CANNOT_DELETE_SELF: 'Você não pode excluir sua própria conta de usuário.',
  ERR_DEFAULT_GROUP_IMMUTABLE: 'O grupo padrão do sistema não pode ser alterado ou excluído.',
  ERR_DEFAULT_GROUP_MEMBER_IMMUTABLE: 'Usuários não podem ser desvinculados do grupo padrão do sistema.',

  // CRUD & Dados
  ERR_NOT_FOUND: 'Recurso não encontrado.',
  ERR_USER_NOT_FOUND: 'Usuário não encontrado.',
  ERR_GROUP_NOT_FOUND: 'Grupo de usuários não encontrado.',
  ERR_ROLE_NOT_FOUND: 'Papel de acesso não encontrado no sistema.',
  ERR_ALREADY_EXISTS: 'O registro informado já existe.',
  ERR_VALIDATION: 'Dados inválidos fornecidos na requisição.',
  ERR_PASSWORD_TOO_SHORT: 'A senha deve conter no mínimo 8 caracteres.',
  ERR_REQUIRED_FIELDS_MISSING: 'Campos obrigatórios não foram preenchidos.',

  // Validações de Usuário & Grupos
  ERR_USER_EMAIL_ALREADY_EXISTS: 'Este endereço de e-mail já está cadastrado.',
  ERR_USER_USERNAME_ALREADY_EXISTS: 'Este nome de usuário já está em uso.',
  ERR_GROUP_NAME_ALREADY_EXISTS: 'Já existe um grupo de usuários com este nome.',
  ERR_USER_ALREADY_IN_GROUP: 'O usuário já é membro deste grupo.',
  ERR_USER_NOT_IN_GROUP: 'O usuário não pertence a este grupo.',
  ERR_PASSWORD_MISMATCH: 'A nova senha e a confirmação não conferem.',
  ERR_INVALID_CURRENT_PASSWORD: 'A senha atual informada está incorreta.',

  // Sistema & Regras de Negócio
  ERR_INTERNAL: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
  ERR_BUSINESS_RULE_VIOLATION: 'Violação de regra de negócio.',
} as const;

// ── Mensagens de Sucesso em Português ──
export const successMessagesPtBr = {
  MSG_USER_CREATED: 'Usuário cadastrado com sucesso.',
  MSG_USER_UPDATED: 'Dados do usuário atualizados com sucesso.',
  MSG_USER_DELETED: 'Usuário {name} ({username}) foi excluído com sucesso.',
  MSG_USER_STATUS_TOGGLED: 'Usuário {name} {status} com sucesso.',
  MSG_USER_UNLOCKED: 'Bloqueio de tentativas de acesso desativado com sucesso.',
  MSG_GROUP_CREATED: 'Grupo de usuários criado com sucesso.',
  MSG_GROUP_UPDATED: 'Grupo de usuários atualizado com sucesso.',
  MSG_GROUP_DELETED: 'Grupo {name} foi excluído com sucesso.',
  MSG_GROUP_STATUS_TOGGLED: 'Status do grupo alterado com sucesso.',
  MSG_GROUP_MEMBER_ADDED: 'Usuário vinculado ao grupo com sucesso.',
  MSG_GROUP_MEMBER_REMOVED: 'Usuário desvinculado do grupo com sucesso.',
  MSG_PASSWORD_RESET_SUCCESS: 'Senha redefinida com sucesso.',
  MSG_PASSWORD_CHANGED_SUCCESS: 'Senha alterada com sucesso.',
  MSG_FORGOT_PASSWORD_SENT: 'Se o e-mail existir no sistema, as instruções foram enviadas.',
  MSG_LOGOUT_SUCCESS: 'Sessão encerrada com sucesso.',
} as const;

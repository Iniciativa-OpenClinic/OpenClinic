/**
 * Canonical bootstrap and seed default credentials and metadata.
 * Harmonized with the UserRole hierarchy: OWNER, ADMIN, USER.
 * Note: DEV_DEFAULT_PASSWORD is strictly for local development and demo seeding,
 * and MUST NEVER be accepted when secureBootstrap / production mode is enabled.
 */
export const BOOTSTRAP_DEFAULTS = {
  DEV_DEFAULT_PASSWORD: 'temp1234',

  // Default Owner (UserRole.OWNER)
  DEFAULT_OWNER_USERNAME: 'joao.silva',
  DEFAULT_OWNER_EMAIL: 'joao@clinica.com.br',
  DEFAULT_OWNER_CPF: '12345678909',
  DEFAULT_OWNER_CPF_FORMATTED: '123.456.789-09',
  DEFAULT_OWNER_FULL_NAME: 'João Silva',
  DEFAULT_OWNER_JOB_TITLE: 'Superadministrador / Proprietário',

  // Default Admin (UserRole.ADMIN)
  DEFAULT_ADMIN_USERNAME: 'admin',
  DEFAULT_ADMIN_EMAIL: 'admin@acme.com',
  DEFAULT_ADMIN_FULL_NAME: 'Administrator',
  DEFAULT_ADMIN_JOB_TITLE: 'System Administrator',

  // Default Standard User (UserRole.USER)
  DEFAULT_USER_USERNAME: 'user',
  DEFAULT_USER_EMAIL: 'user@acme.com',
  DEFAULT_USER_FULL_NAME: 'User',
  DEFAULT_USER_JOB_TITLE: 'Application User',

  // System Organization & Group Defaults
  DEFAULT_GROUP_NAME: 'All Users',
  DEFAULT_SYSTEM_TENANT_NAME: 'Acme Organization',
  DEFAULT_SYSTEM_TENANT_SLUG: 'acme-organization',
  DEFAULT_SYSTEM_TENANT_CNPJ: '00000000000191',
} as const;

export type BootstrapDefaults = typeof BOOTSTRAP_DEFAULTS;

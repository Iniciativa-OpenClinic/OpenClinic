export const UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export type UserRoleType = UserRole;

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.OWNER]: 3,
};

export const ResourceAction = {
  NONE: 'NONE',
  READ: 'READ',
  WRITE: 'WRITE',
  DELETE: 'DELETE',
  EXECUTE: 'EXECUTE',
  MANAGE: 'MANAGE',
  ALL: 'ALL',
} as const;
export type ResourceAction = (typeof ResourceAction)[keyof typeof ResourceAction];
export type ResourceActionType = ResourceAction;

export const PermissionEffect = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
} as const;
export type PermissionEffect = (typeof PermissionEffect)[keyof typeof PermissionEffect];
export type PermissionEffectType = PermissionEffect;

export const AuditStatus = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
} as const;
export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus];
export type AuditStatusType = AuditStatus;

export const AuditResource = {
  IAM_USERS: 'iam_users',
  IAM_GROUPS: 'iam_groups',
  IAM_USER_GROUPS: 'iam_user_groups',
  IAM_LOCKOUTS: 'iam_lockouts',
  AUTH: 'auth',
} as const;
export type AuditResource = (typeof AuditResource)[keyof typeof AuditResource];
export type AuditResourceType = AuditResource;

export const AuditAction = {
  USER_CREATED_BY_ADMIN: 'user_created_by_admin',
  USER_UPDATED_BY_ADMIN: 'user_updated_by_admin',
  USER_DELETED_BY_ADMIN: 'user_deleted_by_admin',
  USER_UNLOCKED_BY_ADMIN: 'user_unlocked_by_admin',
  USER_ACTIVATED: 'user_activated',
  USER_DEACTIVATED: 'user_deactivated',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_CHANGED_SUCCESS: 'change_password_success',
  PASSWORD_CHANGED_FAILED: 'change_password_failed',
  PASSWORD_RESET_SUCCESS: 'reset_password_success',
  ADMIN_RESET_PASSWORD_SUCCESS: 'admin_reset_password_success',
  FORGOT_PASSWORD_REQUESTED: 'forgot_password_requested',
  GROUP_CREATED: 'group_created',
  GROUP_UPDATED: 'group_updated',
  GROUP_DELETED: 'group_deleted',
  GROUP_MEMBER_ADDED: 'group_member_added',
  GROUP_MEMBER_REMOVED: 'group_member_removed',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
export type AuditActionType = AuditAction;

export const TenantStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];
export type TenantStatusType = TenantStatus;

export const AlertBannerType = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
} as const;
export type AlertBannerType = (typeof AlertBannerType)[keyof typeof AlertBannerType];
export type AlertBannerTypeType = AlertBannerType;

export const NotificationType = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export type NotificationTypeType = NotificationType;

export const ResourceType = {
  API: 'API',
  MENU: 'MENU',
  MENU_ITEM: 'MENU_ITEM',
  DATA: 'DATA',
  DOCUMENT: 'DOCUMENT',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];
export type ResourceTypeType = ResourceType;

export const ApplicationContext = {
  ARCH: 'ARCH',
  BUSINESS: 'BUSINESS',
} as const;
export type ApplicationContext = (typeof ApplicationContext)[keyof typeof ApplicationContext];
export type ApplicationContextType = ApplicationContext;

export const PermissionTargetType = {
  USER: 'USER',
  GROUP: 'GROUP',
} as const;
export type PermissionTargetType = (typeof PermissionTargetType)[keyof typeof PermissionTargetType];
export type PermissionTargetTypeType = PermissionTargetType;

export const LoginIdentifierType = {
  CPF: 'CPF',
  USERNAME: 'USERNAME',
  EMAIL: 'EMAIL',
} as const;
export type LoginIdentifierType = (typeof LoginIdentifierType)[keyof typeof LoginIdentifierType];
export type LoginIdentifierTypeType = LoginIdentifierType;

export const NodeEnvironment = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;
export type NodeEnvironment = (typeof NodeEnvironment)[keyof typeof NodeEnvironment];
export type NodeEnvironmentType = NodeEnvironment;

export const Environment = NodeEnvironment;
export type Environment = NodeEnvironment;
export type EnvironmentType = NodeEnvironment;

export const LogLevel = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
export type LogLevelType = LogLevel;

export const SecretsProvider = {
  ENV: 'env',
  FILE: 'file',
  GSM: 'gsm',
  AWS: 'aws',
} as const;
export type SecretsProvider = (typeof SecretsProvider)[keyof typeof SecretsProvider];
export type SecretsProviderType = SecretsProvider;

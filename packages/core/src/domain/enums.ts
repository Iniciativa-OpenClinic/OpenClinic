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


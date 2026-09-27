/**
 * Canonical audit trail constants and default operator identifiers.
 * Harmonized with the UserRole hierarchy: OWNER, ADMIN, USER.
 */
export const AUDIT_CONSTANTS = {
  SYSTEM_OPERATOR: 'system',
  ANONYMOUS_OPERATOR: 'anonymous',
  DEFAULT_OWNER_USERNAME: 'superadmin',
  DEFAULT_ADMIN_USERNAME: 'admin',
  DEFAULT_USER_USERNAME: 'user',
} as const;

export type AuditConstants = typeof AUDIT_CONSTANTS;

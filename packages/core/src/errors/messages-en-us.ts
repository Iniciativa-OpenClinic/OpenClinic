/**
 * Catálogo Central de Mensagens de Erro e Sucesso - English (United States)
 * Single source of truth for English error and success messages.
 */

// ── Mensagens de Erro em Inglês ──
export const errorMessagesEnUs = {
  // Authentication & Session
  ERR_AUTH_FAILED: 'Invalid credentials.\nPlease check your username and password.',
  ERR_USER_DISABLED: 'This user account is disabled. Please contact the administrator.',
  ERR_TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  ERR_TOKEN_INVALID: 'Invalid or corrupted authentication token.',
  ERR_AUTH_HEADER_MISSING: 'Missing or invalid Authorization header.',
  ERR_AUTH_BRUTE_FORCE_LOCKED: 'Too many failed attempts. Access temporarily blocked for security.',
  ERR_AUTH_PASSWORD_CHANGE_REQUIRED: 'Password change is required before proceeding.',

  // Authorization & Permissions (RBAC)
  ERR_FORBIDDEN: 'You do not have permission to access this resource.',
  ERR_ACCESS_DENIED: 'Access denied.',
  ERR_INSUFFICIENT_ROLE: 'Insufficient access role for this resource.',
  ERR_INCOMPATIBLE_RESOURCE_ROLE: 'Cannot grant permission for a resource that requires a role higher than the user role.',
  ERR_OWNER_IMMUTABLE: 'Administrators are not permitted to modify or delete an OWNER user.',
  ERR_CANNOT_PROMOTE_TO_OWNER: 'Administrators cannot promote users to the OWNER role.',
  ERR_USER_CANNOT_DEACTIVATE_SELF: 'You cannot deactivate your own user account.',
  ERR_USER_CANNOT_DELETE_SELF: 'You cannot delete your own user account.',
  ERR_DEFAULT_GROUP_IMMUTABLE: 'The default system group cannot be modified or deleted.',
  ERR_DEFAULT_GROUP_MEMBER_IMMUTABLE: 'Users cannot be unlinked from the default system group.',

  // CRUD & Data
  ERR_NOT_FOUND: 'Resource not found.',
  ERR_USER_NOT_FOUND: 'User not found.',
  ERR_GROUP_NOT_FOUND: 'User group not found.',
  ERR_ROLE_NOT_FOUND: 'Access role not found in the system.',
  ERR_ALREADY_EXISTS: 'The specified record already exists.',
  ERR_VALIDATION: 'Invalid data provided in request.',
  ERR_PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
  ERR_REQUIRED_FIELDS_MISSING: 'Required fields are missing.',

  // User & Group Specific Validations
  ERR_USER_EMAIL_ALREADY_EXISTS: 'This email address is already registered.',
  ERR_USER_USERNAME_ALREADY_EXISTS: 'This username is already taken.',
  ERR_GROUP_NAME_ALREADY_EXISTS: 'A user group with this name already exists.',
  ERR_USER_ALREADY_IN_GROUP: 'User is already a member of this group.',
  ERR_USER_NOT_IN_GROUP: 'User does not belong to this group.',
  ERR_PASSWORD_MISMATCH: 'The new password and confirmation do not match.',
  ERR_INVALID_CURRENT_PASSWORD: 'The current password provided is incorrect.',

  // System & Business Rules
  ERR_INTERNAL: 'An internal server error occurred. Please try again later.',
  ERR_BUSINESS_RULE_VIOLATION: 'Business rule violation.',
} as const;

// ── Mensagens de Sucesso em Inglês ──
export const successMessagesEnUs = {
  MSG_USER_CREATED: 'User registered successfully.',
  MSG_USER_UPDATED: 'User data updated successfully.',
  MSG_USER_DELETED: 'User {name} ({username}) was deleted successfully.',
  MSG_USER_STATUS_TOGGLED: 'User {name} {status} successfully.',
  MSG_USER_UNLOCKED: 'Access lockout cleared successfully.',
  MSG_GROUP_CREATED: 'User group created successfully.',
  MSG_GROUP_UPDATED: 'User group updated successfully.',
  MSG_GROUP_DELETED: 'Group {name} was deleted successfully.',
  MSG_GROUP_STATUS_TOGGLED: 'Group status updated successfully.',
  MSG_GROUP_MEMBER_ADDED: 'User added to group successfully.',
  MSG_GROUP_MEMBER_REMOVED: 'User removed from group successfully.',
  MSG_PASSWORD_RESET_SUCCESS: 'Password reset successfully.',
  MSG_PASSWORD_CHANGED_SUCCESS: 'Password changed successfully.',
  MSG_FORGOT_PASSWORD_SENT: 'If the email exists in the system, instructions have been sent.',
  MSG_LOGOUT_SUCCESS: 'Session ended successfully.',
} as const;

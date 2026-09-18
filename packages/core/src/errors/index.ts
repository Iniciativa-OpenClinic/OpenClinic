import { SupportedLocales, DEFAULT_LOCALE, type SupportedLocale } from '../domain/locales.js';
import { getErrorMessage } from '../i18n/index.js';

// Standardized Error Codes
export const ErrorCode = {
  // Authentication & Session
  AUTH_FAILED: 'ERR_AUTH_FAILED',
  USER_DISABLED: 'ERR_USER_DISABLED',
  TOKEN_EXPIRED: 'ERR_TOKEN_EXPIRED',
  TOKEN_INVALID: 'ERR_TOKEN_INVALID',
  BRUTE_FORCE_LOCKED: 'ERR_AUTH_BRUTE_FORCE_LOCKED',
  PASSWORD_CHANGE_REQUIRED: 'ERR_AUTH_PASSWORD_CHANGE_REQUIRED',
  AUTH_HEADER_MISSING: 'ERR_AUTH_HEADER_MISSING',

  // Authorization & Permissions (RBAC)
  FORBIDDEN: 'ERR_FORBIDDEN',
  ACCESS_DENIED: 'ERR_ACCESS_DENIED',
  INSUFFICIENT_ROLE: 'ERR_INSUFFICIENT_ROLE',
  INCOMPATIBLE_RESOURCE_ROLE: 'ERR_INCOMPATIBLE_RESOURCE_ROLE',
  OWNER_IMMUTABLE: 'ERR_OWNER_IMMUTABLE',
  CANNOT_PROMOTE_TO_OWNER: 'ERR_CANNOT_PROMOTE_TO_OWNER',
  USER_CANNOT_DEACTIVATE_SELF: 'ERR_USER_CANNOT_DEACTIVATE_SELF',
  USER_CANNOT_DELETE_SELF: 'ERR_USER_CANNOT_DELETE_SELF',
  DEFAULT_GROUP_IMMUTABLE: 'ERR_DEFAULT_GROUP_IMMUTABLE',
  DEFAULT_GROUP_MEMBER_IMMUTABLE: 'ERR_DEFAULT_GROUP_MEMBER_IMMUTABLE',

  // CRUD & Data
  NOT_FOUND: 'ERR_NOT_FOUND',
  USER_NOT_FOUND: 'ERR_USER_NOT_FOUND',
  GROUP_NOT_FOUND: 'ERR_GROUP_NOT_FOUND',
  ROLE_NOT_FOUND: 'ERR_ROLE_NOT_FOUND',
  ALREADY_EXISTS: 'ERR_ALREADY_EXISTS',
  VALIDATION_ERROR: 'ERR_VALIDATION',
  PASSWORD_TOO_SHORT: 'ERR_PASSWORD_TOO_SHORT',
  REQUIRED_FIELDS_MISSING: 'ERR_REQUIRED_FIELDS_MISSING',

  // User & Group Validations
  USER_EMAIL_EXISTS: 'ERR_USER_EMAIL_ALREADY_EXISTS',
  USER_USERNAME_EXISTS: 'ERR_USER_USERNAME_ALREADY_EXISTS',
  GROUP_NAME_EXISTS: 'ERR_GROUP_NAME_ALREADY_EXISTS',
  USER_ALREADY_IN_GROUP: 'ERR_USER_ALREADY_IN_GROUP',
  USER_NOT_IN_GROUP: 'ERR_USER_NOT_IN_GROUP',
  PASSWORD_MISMATCH: 'ERR_PASSWORD_MISMATCH',
  INVALID_CURRENT_PASSWORD: 'ERR_INVALID_CURRENT_PASSWORD',

  // System & Business Rules
  INTERNAL_ERROR: 'ERR_INTERNAL',
  BUSINESS_RULE_VIOLATION: 'ERR_BUSINESS_RULE_VIOLATION',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance?: string;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(
    code: string = ErrorCode.INTERNAL_ERROR,
    message?: string,
    statusCode: number = 500,
    details: Record<string, unknown> = {},
    locale: SupportedLocale = DEFAULT_LOCALE
  ) {
    const resolvedMsg = message ?? getErrorMessage(code, locale, details);
    super(resolvedMsg);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toProblemDetail(instance?: string, locale: SupportedLocale = DEFAULT_LOCALE): ProblemDetail {
    const isStandardMessage =
      !this.message ||
      this.message === getErrorMessage(this.code, SupportedLocales.PT_BR, this.details) ||
      this.message === getErrorMessage(this.code, SupportedLocales.EN_US, this.details);
    const detail = isStandardMessage
      ? getErrorMessage(this.code, locale, this.details)
      : this.message;

    return {
      type: `urn:openclinic:error:${this.code.toLowerCase().replace(/_/g, '-')}`,
      title: this.name,
      status: this.statusCode,
      code: this.code,
      detail,
      instance,
      details: Object.keys(this.details).length > 0 ? this.details : undefined,
    };
  }
}

export class DomainError extends AppError {
  constructor(code: string = ErrorCode.BUSINESS_RULE_VIOLATION, message?: string, details: Record<string, unknown> = {}) {
    super(code, message ?? getErrorMessage(code, DEFAULT_LOCALE, details), 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(code: string = ErrorCode.AUTH_FAILED, message?: string, details: Record<string, unknown> = {}) {
    super(code, message ?? getErrorMessage(code, DEFAULT_LOCALE, details), 401, details);
  }
}

export class AccessDeniedError extends AppError {
  constructor(code: string = ErrorCode.FORBIDDEN, message?: string, details: Record<string, unknown> = {}) {
    super(code, message ?? getErrorMessage(code, DEFAULT_LOCALE, details), 403, details);
  }
}

export class EntityNotFoundError extends AppError {
  constructor(entityName: string = 'Resource', entityId: string = 'unknown', code: string = ErrorCode.NOT_FOUND) {
    super(code, `${entityName} not found.`, 404, { entity: entityName, id: entityId });
  }
}

export class EntityAlreadyExistsError extends AppError {
  constructor(entityName: string, field: string, value: string, code: string = ErrorCode.ALREADY_EXISTS) {
    super(code, `${entityName} with this ${field} already exists.`, 409, { entity: entityName, field, value });
  }
}

export class ValidationError extends AppError {
  constructor(field: string, codeOrMessage: string = ErrorCode.VALIDATION_ERROR, details: Record<string, unknown> = {}) {
    const isCode = codeOrMessage.startsWith('ERR_');
    const code = isCode ? codeOrMessage : ErrorCode.VALIDATION_ERROR;
    const message = isCode ? getErrorMessage(code, DEFAULT_LOCALE, { field, ...details }) : `${field}: ${codeOrMessage}`;
    super(code, message, 422, { field, ...details });
  }
}

export class BruteForceError extends AppError {
  constructor(remainingMinutes: number = 15) {
    super(
      ErrorCode.BRUTE_FORCE_LOCKED,
      `Too many failed attempts. Access temporarily locked for security. Try again in ${remainingMinutes} minute(s).`,
      429,
      { remaining_minutes: remainingMinutes }
    );
  }
}

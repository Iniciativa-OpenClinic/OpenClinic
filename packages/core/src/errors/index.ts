import { errorMessagesPtBr, successMessagesPtBr } from './messages-pt-br.js';
import { errorMessagesEnUs, successMessagesEnUs } from './messages-en-us.js';
import { SupportedLocales, DEFAULT_LOCALE, type SupportedLocale } from '../domain/locales.js';

// ── Códigos de Erro Padronizados ──
export const ErrorCode = {
  // Autenticação & Sessão
  AUTH_FAILED: 'ERR_AUTH_FAILED',
  USER_DISABLED: 'ERR_USER_DISABLED',
  TOKEN_EXPIRED: 'ERR_TOKEN_EXPIRED',
  TOKEN_INVALID: 'ERR_TOKEN_INVALID',
  BRUTE_FORCE_LOCKED: 'ERR_AUTH_BRUTE_FORCE_LOCKED',
  PASSWORD_CHANGE_REQUIRED: 'ERR_AUTH_PASSWORD_CHANGE_REQUIRED',
  AUTH_HEADER_MISSING: 'ERR_AUTH_HEADER_MISSING',

  // Autorização & Permissões (RBAC)
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

  // CRUD & Dados
  NOT_FOUND: 'ERR_NOT_FOUND',
  USER_NOT_FOUND: 'ERR_USER_NOT_FOUND',
  GROUP_NOT_FOUND: 'ERR_GROUP_NOT_FOUND',
  ROLE_NOT_FOUND: 'ERR_ROLE_NOT_FOUND',
  ALREADY_EXISTS: 'ERR_ALREADY_EXISTS',
  VALIDATION_ERROR: 'ERR_VALIDATION',
  PASSWORD_TOO_SHORT: 'ERR_PASSWORD_TOO_SHORT',
  REQUIRED_FIELDS_MISSING: 'ERR_REQUIRED_FIELDS_MISSING',

  // Validações de Usuário & Grupos
  USER_EMAIL_EXISTS: 'ERR_USER_EMAIL_ALREADY_EXISTS',
  USER_USERNAME_EXISTS: 'ERR_USER_USERNAME_ALREADY_EXISTS',
  GROUP_NAME_EXISTS: 'ERR_GROUP_NAME_ALREADY_EXISTS',
  USER_ALREADY_IN_GROUP: 'ERR_USER_ALREADY_IN_GROUP',
  USER_NOT_IN_GROUP: 'ERR_USER_NOT_IN_GROUP',
  PASSWORD_MISMATCH: 'ERR_PASSWORD_MISMATCH',
  INVALID_CURRENT_PASSWORD: 'ERR_INVALID_CURRENT_PASSWORD',

  // Sistema & Regras de Negócio
  INTERNAL_ERROR: 'ERR_INTERNAL',
  BUSINESS_RULE_VIOLATION: 'ERR_BUSINESS_RULE_VIOLATION',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

// ── Códigos de Sucesso Padronizados ──
export const SuccessCode = {
  USER_CREATED: 'MSG_USER_CREATED',
  USER_UPDATED: 'MSG_USER_UPDATED',
  USER_DELETED: 'MSG_USER_DELETED',
  USER_STATUS_TOGGLED: 'MSG_USER_STATUS_TOGGLED',
  USER_UNLOCKED: 'MSG_USER_UNLOCKED',
  GROUP_CREATED: 'MSG_GROUP_CREATED',
  GROUP_UPDATED: 'MSG_GROUP_UPDATED',
  GROUP_DELETED: 'MSG_GROUP_DELETED',
  GROUP_STATUS_TOGGLED: 'MSG_GROUP_STATUS_TOGGLED',
  GROUP_MEMBER_ADDED: 'MSG_GROUP_MEMBER_ADDED',
  GROUP_MEMBER_REMOVED: 'MSG_GROUP_MEMBER_REMOVED',
  PASSWORD_RESET_SUCCESS: 'MSG_PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGED_SUCCESS: 'MSG_PASSWORD_CHANGED_SUCCESS',
  FORGOT_PASSWORD_SENT: 'MSG_FORGOT_PASSWORD_SENT',
  LOGOUT_SUCCESS: 'MSG_LOGOUT_SUCCESS',
} as const;

export type SuccessCodeValue = (typeof SuccessCode)[keyof typeof SuccessCode];

export { SupportedLocales, DEFAULT_LOCALE, type SupportedLocale } from '../domain/locales.js';

export type ErrorMessageCatalog = Record<ErrorCodeValue, string>;
export type SuccessMessageCatalog = Record<SuccessCodeValue, string>;

export { errorMessagesPtBr, successMessagesPtBr, errorMessagesEnUs, successMessagesEnUs };

export function formatTemplate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

// Catálogos estruturados por locale
export const errorCatalogs: Record<SupportedLocale, Record<string, string>> = {
  [SupportedLocales.PT_BR]: errorMessagesPtBr,
  [SupportedLocales.EN_US]: errorMessagesEnUs,
};

export const successCatalogs: Record<SupportedLocale, Record<string, string>> = {
  [SupportedLocales.PT_BR]: successMessagesPtBr,
  [SupportedLocales.EN_US]: successMessagesEnUs,
};

const errorPtDict: Record<string, string> = errorMessagesPtBr;
const errorEnDict: Record<string, string> = errorMessagesEnUs;
const successPtDict: Record<string, string> = successMessagesPtBr;
const successEnDict: Record<string, string> = successMessagesEnUs;

// Dicionários unificados (Retrocompatibilidade)
export const ErrorMessages: Record<string, Record<SupportedLocale, string>> = Object.keys(errorPtDict).reduce(
  (acc, code) => {
    acc[code] = {
      [SupportedLocales.PT_BR]: errorPtDict[code] ?? '',
      [SupportedLocales.EN_US]: errorEnDict[code] ?? errorPtDict[code] ?? '',
    };
    return acc;
  },
  {} as Record<string, Record<SupportedLocale, string>>
);

export const SuccessMessages: Record<string, Record<SupportedLocale, string>> = Object.keys(successPtDict).reduce(
  (acc, code) => {
    acc[code] = {
      [SupportedLocales.PT_BR]: successPtDict[code] ?? '',
      [SupportedLocales.EN_US]: successEnDict[code] ?? successPtDict[code] ?? '',
    };
    return acc;
  },
  {} as Record<string, Record<SupportedLocale, string>>
);

export function getErrorMessage(code: string, locale: SupportedLocale = DEFAULT_LOCALE, params?: Record<string, unknown>): string {
  const catalog = errorCatalogs[locale] ?? errorCatalogs[DEFAULT_LOCALE];
  const fallbackCatalog = errorCatalogs[DEFAULT_LOCALE];
  const tmpl = catalog[code] ?? fallbackCatalog[code] ?? catalog[ErrorCode.INTERNAL_ERROR] ?? fallbackCatalog[ErrorCode.INTERNAL_ERROR];
  return formatTemplate(tmpl, params);
}

export function getSuccessMessage(code: string, locale: SupportedLocale = DEFAULT_LOCALE, params?: Record<string, unknown>): string {
  const catalog = successCatalogs[locale] ?? successCatalogs[DEFAULT_LOCALE];
  const fallbackCatalog = successCatalogs[DEFAULT_LOCALE];
  const tmpl = catalog[code] ?? fallbackCatalog[code] ?? code;
  return formatTemplate(tmpl, params);
}

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
  constructor(entityName: string = 'Recurso', entityId: string = 'unknown', code: string = ErrorCode.NOT_FOUND) {
    super(code, `${entityName} não encontrado(a).`, 404, { entity: entityName, id: entityId });
  }
}

export class EntityAlreadyExistsError extends AppError {
  constructor(entityName: string, field: string, value: string, code: string = ErrorCode.ALREADY_EXISTS) {
    super(code, `${entityName} com este(a) ${field} já existe.`, 409, { entity: entityName, field, value });
  }
}

export class ValidationError extends AppError {
  constructor(field: string, codeOrMessage: string = ErrorCode.VALIDATION_ERROR, details: Record<string, unknown> = {}) {
    const isCode = codeOrMessage in errorMessagesPtBr;
    const code = isCode ? codeOrMessage : ErrorCode.VALIDATION_ERROR;
    const message = isCode ? getErrorMessage(code, DEFAULT_LOCALE, { field, ...details }) : `${field}: ${codeOrMessage}`;
    super(code, message, 422, { field, ...details });
  }
}

export class BruteForceError extends AppError {
  constructor(remainingMinutes: number = 15) {
    super(
      ErrorCode.BRUTE_FORCE_LOCKED,
      `Muitas tentativas falhas. Acesso bloqueado por segurança. Tente novamente em ${remainingMinutes} minuto(s).`,
      429,
      { remaining_minutes: remainingMinutes }
    );
  }
}

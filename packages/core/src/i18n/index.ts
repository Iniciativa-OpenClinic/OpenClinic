import { localePtBr } from './locales/pt-br.js';
import { localeEnUs } from './locales/en-us.js';
import { SupportedLocales, DEFAULT_LOCALE, type SupportedLocale } from '../domain/locales.js';

// Standardized Success Codes
export const SuccessCode = {
  FORGOT_PASSWORD_SENT: 'MSG_FORGOT_PASSWORD_SENT',
  GROUP_CREATED: 'MSG_GROUP_CREATED',
  GROUP_DELETED: 'MSG_GROUP_DELETED',
  GROUP_MEMBER_ADDED: 'MSG_GROUP_MEMBER_ADDED',
  GROUP_MEMBER_REMOVED: 'MSG_GROUP_MEMBER_REMOVED',
  GROUP_STATUS_TOGGLED: 'MSG_GROUP_STATUS_TOGGLED',
  GROUP_UPDATED: 'MSG_GROUP_UPDATED',
  LOGOUT_SUCCESS: 'MSG_LOGOUT_SUCCESS',
  PASSWORD_CHANGED_SUCCESS: 'MSG_PASSWORD_CHANGED_SUCCESS',
  PASSWORD_RESET_SUCCESS: 'MSG_PASSWORD_RESET_SUCCESS',
  USER_CREATED: 'MSG_USER_CREATED',
  USER_DELETED: 'MSG_USER_DELETED',
  USER_STATUS_TOGGLED: 'MSG_USER_STATUS_TOGGLED',
  USER_UNLOCKED: 'MSG_USER_UNLOCKED',
  USER_UPDATED: 'MSG_USER_UPDATED',
} as const;

export type SuccessCodeValue = (typeof SuccessCode)[keyof typeof SuccessCode];

export { localePtBr, localeEnUs };

export function formatTemplate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

// Catalogs structured by locale
export const catalogs: Record<SupportedLocale, Record<string, string>> = {
  [SupportedLocales.PT_BR]: localePtBr,
  [SupportedLocales.EN_US]: localeEnUs,
};

export function getErrorMessage(code: string, locale: SupportedLocale = DEFAULT_LOCALE, params?: Record<string, unknown>): string {
  const catalog = catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
  const fallbackCatalog = catalogs[DEFAULT_LOCALE];
  const tmpl = catalog[code] ?? fallbackCatalog[code] ?? catalog['ERR_INTERNAL'] ?? fallbackCatalog['ERR_INTERNAL'];
  return formatTemplate(tmpl, params);
}

export function getSuccessMessage(code: string, locale: SupportedLocale = DEFAULT_LOCALE, params?: Record<string, unknown>): string {
  const catalog = catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
  const fallbackCatalog = catalogs[DEFAULT_LOCALE];
  const tmpl = catalog[code] ?? fallbackCatalog[code] ?? code;
  return formatTemplate(tmpl, params);
}

/**
 * Central Translation and UI Presentation Catalog (OpenClinic)
 * Single source of truth for labels, buttons, tooltips, modals, navigation, and messages.
 */

import {
  SupportedLocales,
  type SupportedLocale,
  type TranslationKey,
  type TranslationCatalog,
} from './types.js';
import { localePtBr } from './locales/pt-br.js';
import { localeEnUs } from './locales/en-us.js';
import {
  catalogs,
  getStoredLocale,
  useI18n,
  I18nProvider,
  LOCALE_STORAGE_KEY,
} from './context.js';

export {
  SupportedLocales,
  localePtBr,
  localeEnUs,
  catalogs,
  getStoredLocale,
  useI18n,
  I18nProvider,
  LOCALE_STORAGE_KEY,
};
export type {
  SupportedLocale,
  TranslationKey,
  TranslationCatalog,
};

// Canonical default translations object (PT-BR)
export const Translations = localePtBr;

/**
 * Returns the translated string from the catalog with variable interpolation and active locale support:
 * Ex: getTranslation('HELP_TICKET_SENT_SUCCESS', { id: 'TKT-102' })
 */
export function getTranslation(
  key: TranslationKey,
  params?: Record<string, unknown>,
  locale?: SupportedLocale
): string {
  const targetLocale = locale ?? getStoredLocale();
  const catalog = catalogs[targetLocale] ?? localePtBr;
  const template = catalog[key] ?? localePtBr[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, varName) => {
    return params[varName] !== undefined ? String(params[varName]) : `{${varName}}`;
  });
}

// Export standard t function and useTranslation hook
export const t = getTranslation;
export { useI18n as useTranslation };

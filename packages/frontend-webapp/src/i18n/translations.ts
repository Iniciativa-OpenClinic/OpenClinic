/**
 * Catálogo Central de Traduções e Apresentação da UI (OpenClinic)
 * Ponto único da verdade para rótulos, botões, tooltips, modais, navegação e mensagens.
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

// Objeto canônico de traduções padrão (PT-BR)
export const Translations = localePtBr;

/**
 * Retorna o texto traduzido do catálogo com suporte a interpolação de variáveis e locale ativo:
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

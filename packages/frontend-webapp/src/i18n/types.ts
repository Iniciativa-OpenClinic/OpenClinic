import type { localePtBr } from './locales/pt-br.js';

export {
  SupportedLocales,
  DEFAULT_LOCALE,
  type SupportedLocale,
  LOCALE_METADATA,
  type LocaleMetadata,
  getLocaleMetadata,
} from '@openclinic/core/shared';

export type TranslationKey = keyof typeof localePtBr;

export type TranslationCatalog = Record<TranslationKey, string>;

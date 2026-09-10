export const SupportedLocales = {
  PT_BR: 'pt-BR',
  EN_US: 'en-US',
} as const;

export type SupportedLocale = (typeof SupportedLocales)[keyof typeof SupportedLocales];

export const DEFAULT_LOCALE = SupportedLocales.PT_BR;

export interface LocaleMetadata {
  code: SupportedLocale;
  shortLabel: string;
  nativeName: string;
  flag: string;
  labelKey: string;
  fallbackLabel: string;
}

export const LOCALE_METADATA: Record<SupportedLocale, LocaleMetadata> = {
  [SupportedLocales.PT_BR]: {
    code: SupportedLocales.PT_BR,
    shortLabel: 'PT',
    nativeName: 'Português (Brasil)',
    flag: '🇧🇷',
    labelKey: 'PLATFORM_SETTINGS_LANG_PT',
    fallbackLabel: 'Português (Brasil)',
  },
  [SupportedLocales.EN_US]: {
    code: SupportedLocales.EN_US,
    shortLabel: 'EN',
    nativeName: 'English (US)',
    flag: '🇺🇸',
    labelKey: 'PLATFORM_SETTINGS_LANG_EN',
    fallbackLabel: 'English (US)',
  },
} as const;

export function getLocaleMetadata(locale: string): LocaleMetadata {
  return (
    LOCALE_METADATA[locale as SupportedLocale] ?? {
      code: SupportedLocales.PT_BR,
      shortLabel: locale.slice(0, 2).toUpperCase(),
      nativeName: locale,
      flag: '🌐',
      labelKey: 'LANG_PT',
      fallbackLabel: locale,
    }
  );
}


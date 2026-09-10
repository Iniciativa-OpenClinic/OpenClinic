import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { SupportedLocales, DEFAULT_LOCALE, type SupportedLocale } from '@openclinic/core/shared';
import type { TranslationKey, TranslationCatalog } from './types.js';
import { localePtBr } from './locales/pt-br.js';
import { localeEnUs } from './locales/en-us.js';

export const LOCALE_STORAGE_KEY = 'openclinic_locale';
export const SUPPORTED_LOCALES_STORAGE_KEY = 'openclinic_supported_locales';

export const catalogs: Record<SupportedLocale, TranslationCatalog> = {
  [SupportedLocales.PT_BR]: localePtBr,
  [SupportedLocales.EN_US]: localeEnUs,
};

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  supportedLocales: string[];
  setSupportedLocales: (locales: string[]) => void;
  t: (key: TranslationKey, params?: Record<string, unknown>) => string;
  catalog: TranslationCatalog;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function getStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null;
  if (saved === SupportedLocales.EN_US || saved === SupportedLocales.PT_BR) {
    return saved;
  }
  return DEFAULT_LOCALE;
}

export function getStoredSupportedLocales(): string[] {
  if (typeof window === 'undefined') return [SupportedLocales.PT_BR, SupportedLocales.EN_US];
  try {
    const saved = localStorage.getItem(SUPPORTED_LOCALES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [SupportedLocales.PT_BR, SupportedLocales.EN_US];
}

export function I18nProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [locale, setLocaleState] = useState<SupportedLocale>(getStoredLocale);
  const [supportedLocales, setSupportedLocalesState] = useState<string[]>(getStoredSupportedLocales);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  };

  const setSupportedLocales = (locales: string[]) => {
    setSupportedLocalesState(locales);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUPPORTED_LOCALES_STORAGE_KEY, JSON.stringify(locales));
    }
    if (locales.length > 0 && !locales.includes(locale)) {
      setLocale(locales[0] as SupportedLocale);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const currentCatalog = useMemo(() => catalogs[locale] ?? localePtBr, [locale]);

  const t = useMemo(() => {
    return (key: TranslationKey, params?: Record<string, unknown>): string => {
      const template = currentCatalog[key] ?? localePtBr[key] ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (_, varName) => {
        return params[varName] !== undefined ? String(params[varName]) : `{${varName}}`;
      });
    };
  }, [currentCatalog]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      supportedLocales,
      setSupportedLocales,
      t,
      catalog: currentCatalog,
    }),
    [locale, supportedLocales, t, currentCatalog]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback gracioso se usado fora do Provider
    const fallbackCatalog = catalogs[getStoredLocale()] ?? localePtBr;
    return {
      locale: getStoredLocale(),
      setLocale: () => {},
      supportedLocales: getStoredSupportedLocales(),
      setSupportedLocales: () => {},
      t: (key: TranslationKey, params?: Record<string, unknown>) => {
        const template = fallbackCatalog[key] ?? localePtBr[key] ?? key;
        if (!params) return template;
        return template.replace(/\{(\w+)\}/g, (_, varName) => {
          return params[varName] !== undefined ? String(params[varName]) : `{${varName}}`;
        });
      },
      catalog: fallbackCatalog,
    };
  }
  return context;
}

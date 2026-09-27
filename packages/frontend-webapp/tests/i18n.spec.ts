import { describe, it, expect, beforeEach } from 'vitest';
import {
  localePtBr,
  localeEnUs,
  getTranslation,
  t,
  catalogs,
  LOCALE_STORAGE_KEY,
  SupportedLocales,
} from '../src/i18n/index.js';

describe('Frontend i18n Suite', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should have 100% key parity between Portuguese and English catalogs', () => {
    const ptKeys = Object.keys(localePtBr).sort();
    const enKeys = Object.keys(localeEnUs).sort();

    expect(enKeys).toEqual(ptKeys);
    expect(ptKeys.length).toBeGreaterThan(50);
  });

  it('should return Portuguese message by default', () => {
    const msg = getTranslation('NAV_OVERVIEW');
    expect(msg).toBe('Visão Geral');
  });

  it('should return English message when locale is specified', () => {
    const msg = t('NAV_OVERVIEW', undefined, SupportedLocales.EN_US);
    expect(msg).toBe('Overview');
  });

  it('should interpolate variables accurately in both languages', () => {
    const msgPt = t('HELP_TICKET_SENT_SUCCESS', { id: 'TKT-999' }, SupportedLocales.PT_BR);
    expect(msgPt).toBe('Chamado TKT-999 registrado com sucesso! Nossa equipe entrará em contato.');

    const msgEn = t('HELP_TICKET_SENT_SUCCESS', { id: 'TKT-999' }, SupportedLocales.EN_US);
    expect(msgEn).toBe('Ticket TKT-999 registered successfully! Our support team will reach out soon.');
  });

  it('should interpolate session expired message with seconds', () => {
    const msgPt = t('SESSION_EXPIRED_MSG', { seconds: 5 }, SupportedLocales.PT_BR);
    expect(msgPt).toContain('5 segundos');

    const msgEn = t('SESSION_EXPIRED_MSG', { seconds: 5 }, SupportedLocales.EN_US);
    expect(msgEn).toContain('5 seconds');
  });

  it('should fallback gracefully when key is missing or variable is undefined', () => {
    const msg = t('NAV_OVERVIEW', { unused: 'test' }, SupportedLocales.PT_BR);
    expect(msg).toBe('Visão Geral');
  });
});


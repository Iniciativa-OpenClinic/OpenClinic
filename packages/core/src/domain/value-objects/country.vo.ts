import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

export const STANDARD_COUNTRIES = [
  'BRA', // Brazil
  'PRT', // Portugal
  'USA', // United States
  'ARG', // Argentina
  'URY', // Uruguay
  'CHL', // Chile
  'PRY', // Paraguay
  'BOL', // Bolivia
  'PER', // Peru
  'COL', // Colombia
  'ESP', // Spain
  'FRA', // France
  'DEU', // Germany
  'ITA', // Italy
  'GBR', // United Kingdom
  'CAN', // Canada
  'MEX', // Mexico
  'AGO', // Angola
  'MOZ', // Mozambique
  'CPV', // Cape Verde
] as const;

export type CountryCode = (typeof STANDARD_COUNTRIES)[number];

export const COUNTRY_NAMES_PT: Record<CountryCode, string> = {
  BRA: 'Brasil',
  PRT: 'Portugal',
  USA: 'Estados Unidos',
  ARG: 'Argentina',
  URY: 'Uruguai',
  CHL: 'Chile',
  PRY: 'Paraguai',
  BOL: 'Bolívia',
  PER: 'Peru',
  COL: 'Colômbia',
  ESP: 'Espanha',
  FRA: 'França',
  DEU: 'Alemanha',
  ITA: 'Itália',
  GBR: 'Reino Unido',
  CAN: 'Canadá',
  MEX: 'México',
  AGO: 'Angola',
  MOZ: 'Moçambique',
  CPV: 'Cabo Verde',
};

export const COUNTRY_NAMES_EN: Record<CountryCode, string> = {
  BRA: 'Brazil',
  PRT: 'Portugal',
  USA: 'United States',
  ARG: 'Argentina',
  URY: 'Uruguay',
  CHL: 'Chile',
  PRY: 'Paraguay',
  BOL: 'Bolivia',
  PER: 'Peru',
  COL: 'Colombia',
  ESP: 'Spain',
  FRA: 'France',
  DEU: 'Germany',
  ITA: 'Italy',
  GBR: 'United Kingdom',
  CAN: 'Canada',
  MEX: 'Mexico',
  AGO: 'Angola',
  MOZ: 'Mozambique',
  CPV: 'Cape Verde',
};

export interface CountryOption {
  code: CountryCode;
  name: string;
  display: string;
}

/**
 * Value Object representing a country by ISO 3166-1 alpha-3 code.
 * Exposes standardized country lists, validation and localized display names.
 */
export class Country extends ValueObject<CountryCode> {
  private constructor(value: CountryCode) {
    super(value);
  }

  /**
   * Sanitizes raw country code by trimming and converting to uppercase.
   */
  public static clean(raw: string | null | undefined): string {
    return (raw || '').trim().toUpperCase();
  }

  /**
   * Validates if a given code is an accepted ISO 3166-1 alpha-3 standard code.
   */
  public static isValid(raw: string | null | undefined): boolean {
    const cleaned = this.clean(raw);
    return STANDARD_COUNTRIES.includes(cleaned as CountryCode);
  }

  /**
   * Returns localized name for the country code.
   */
  public static getName(code: string | null | undefined, locale = 'pt-BR'): string {
    const cleaned = this.clean(code) as CountryCode;
    if (locale.startsWith('en')) {
      return COUNTRY_NAMES_EN[cleaned] || cleaned;
    }
    return COUNTRY_NAMES_PT[cleaned] || cleaned;
  }

  /**
   * Returns a sorted list of country options formatted for UI dropdowns.
   */
  public static getAllCountries(locale = 'pt-BR'): CountryOption[] {
    const isEn = locale.startsWith('en');
    const nameMap = isEn ? COUNTRY_NAMES_EN : COUNTRY_NAMES_PT;

    return STANDARD_COUNTRIES.map((code) => ({
      code,
      name: nameMap[code] || code,
      display: `${nameMap[code] || code} (${code})`,
    })).sort((a, b) => {
      // Keep BRA first as default primary country, then alphabetical
      if (a.code === 'BRA') return -1;
      if (b.code === 'BRA') return 1;
      return a.name.localeCompare(b.name, locale);
    });
  }

  /**
   * Factory method to create a validated Country instance.
   * Throws ValidationError if code is invalid.
   */
  public static create(raw: string | null | undefined): Country {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError(
        'country',
        ErrorCode.VALIDATION_ERROR,
        { received: raw, expected: STANDARD_COUNTRIES }
      );
    }
    return new Country(cleaned as CountryCode);
  }
}

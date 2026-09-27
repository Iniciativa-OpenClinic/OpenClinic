import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

export const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export type BrazilianUfCode = (typeof BRAZILIAN_UFS)[number];

export type BrazilianRegion = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';

export const BRAZILIAN_UF_NAMES: Record<BrazilianUfCode, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

const UF_REGION_MAP: Record<BrazilianUfCode, BrazilianRegion> = {
  AC: 'Norte',
  AP: 'Norte',
  AM: 'Norte',
  PA: 'Norte',
  RO: 'Norte',
  RR: 'Norte',
  TO: 'Norte',
  AL: 'Nordeste',
  BA: 'Nordeste',
  CE: 'Nordeste',
  MA: 'Nordeste',
  PB: 'Nordeste',
  PE: 'Nordeste',
  PI: 'Nordeste',
  RN: 'Nordeste',
  SE: 'Nordeste',
  DF: 'Centro-Oeste',
  GO: 'Centro-Oeste',
  MT: 'Centro-Oeste',
  MS: 'Centro-Oeste',
  ES: 'Sudeste',
  MG: 'Sudeste',
  RJ: 'Sudeste',
  SP: 'Sudeste',
  PR: 'Sul',
  RS: 'Sul',
  SC: 'Sul',
};

/**
 * Value Object representing a Brazilian Federative Unit (Unidade Federativa - UF).
 * Validates the 27 official state abbreviations and exposes geographical regions and full names.
 */
export class Uf extends ValueObject<BrazilianUfCode> {
  private constructor(value: BrazilianUfCode) {
    super(value);
  }

  /**
   * Sanitizes raw UF input by trimming and converting to uppercase.
   */
  public static clean(raw: string | null | undefined): string {
    return (raw || '').trim().toUpperCase();
  }

  /**
   * Validates if a given string constitutes an official Brazilian UF code.
   */
  public static isValid(raw: string | null | undefined): boolean {
    const cleaned = this.clean(raw);
    return BRAZILIAN_UFS.includes(cleaned as BrazilianUfCode);
  }

  /**
   * Factory method to create a validated Uf instance.
   * Throws ValidationError if code is not a valid Brazilian UF.
   */
  public static create(raw: string): Uf {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('uf', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Uf(cleaned as BrazilianUfCode);
  }

  /**
   * Returns the full official state name (ex: 'São Paulo', 'Rio de Janeiro').
   */
  public get stateName(): string {
    return BRAZILIAN_UF_NAMES[this._value];
  }

  /**
   * Static helper to get full state name by UF code.
   */
  public static getStateName(code: BrazilianUfCode): string {
    return BRAZILIAN_UF_NAMES[code];
  }

  /**
   * Formats a UF into canonical presentation: "UF - State Name" (e.g. "SP - São Paulo").
   * Standard across OpenClinic UI whenever displaying federative units.
   */
  public static format(code: string | null | undefined): string {
    const cleaned = this.clean(code);
    if (this.isValid(cleaned)) {
      return `${cleaned} - ${BRAZILIAN_UF_NAMES[cleaned as BrazilianUfCode]}`;
    }
    return cleaned || '-';
  }

  /**
   * Returns canonical formatted presentation: "UF - State Name".
   */
  public format(): string {
    return `${this._value} - ${this.stateName}`;
  }

  /**
   * Returns the geographical macro-region of the UF.
   */
  public get region(): BrazilianRegion {
    return UF_REGION_MAP[this._value];
  }

  /**
   * Returns 2-letter uppercase UF string representation.
   */
  public toString(): string {
    return this._value;
  }
}

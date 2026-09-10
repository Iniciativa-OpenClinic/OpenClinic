import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Cadastro Nacional da Pessoa Jurídica (CNPJ) Value Object.
 * Conforms to Receita Federal do Brasil standards and SBIS ECF.17.16 requirement.
 * 14 numeric digits with two Modulo 11 check digits.
 */
export class Cnpj extends ValueObject<string> {
  private static readonly WEIGHTS_FIRST = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  private static readonly WEIGHTS_SECOND = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes CNPJ by stripping non-numeric characters.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    return raw.replace(/\D/g, '');
  }

  /**
   * Validates a CNPJ string using Receita Federal Modulo 11 check digits.
   */
  public static isValid(raw: string): boolean {
    const cleaned = this.clean(raw);

    if (cleaned.length !== 14) {
      return false;
    }

    // Reject sequences with all identical digits (e.g., 00000000000000, 11111111111111)
    if (/^(\d)\1{13}$/.test(cleaned)) {
      return false;
    }

    // First check digit
    let sum1 = 0;
    for (let i = 0; i < 12; i++) {
      sum1 += Number(cleaned.charAt(i)) * this.WEIGHTS_FIRST[i];
    }
    const remainder1 = sum1 % 11;
    const digit1 = remainder1 < 2 ? 0 : 11 - remainder1;

    if (Number(cleaned.charAt(12)) !== digit1) {
      return false;
    }

    // Second check digit
    let sum2 = 0;
    for (let i = 0; i < 13; i++) {
      sum2 += Number(cleaned.charAt(i)) * this.WEIGHTS_SECOND[i];
    }
    const remainder2 = sum2 % 11;
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;

    return Number(cleaned.charAt(13)) === digit2;
  }

  /**
   * Formats a CNPJ string into standard format: 00.000.000/0000-00.
   */
  public static format(raw: string): string {
    const cleaned = this.clean(raw).slice(0, 14);
    if (!cleaned) return '';

    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length <= 12) {
      return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    }
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }

  /**
   * Factory method to create an immutable CNPJ Value Object.
   */
  public static create(raw: string): Cnpj {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('cnpj', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Cnpj(cleaned);
  }

  public get formatted(): string {
    return Cnpj.format(this._value);
  }
}

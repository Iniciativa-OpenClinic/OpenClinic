import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Brazilian Postal Code (CEP - Código de Endereçamento Postal) Value Object.
 * Conforms to Correios standards and FHIR Address specification.
 * Composed of exactly 8 numeric digits, formatted as "00000-000".
 */
export class Cep extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes CEP by stripping non-numeric characters.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    return raw.replace(/\D/g, '');
  }

  /**
   * Validates if raw string constitutes a valid 8-digit CEP.
   */
  public static isValid(raw: string): boolean {
    const cleaned = this.clean(raw);
    return /^\d{8}$/.test(cleaned) && cleaned !== '00000000';
  }

  /**
   * Formats an 8-digit CEP into standard format: 00000-000.
   */
  public static format(raw: string): string {
    const cleaned = this.clean(raw).slice(0, 8);
    if (!cleaned) return '';

    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }

  /**
   * Factory method to create an immutable CEP Value Object.
   */
  public static create(raw: string): Cep {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('cep', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Cep(cleaned);
  }

  public get formatted(): string {
    return Cep.format(this._value);
  }
}

import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * National Registry of Health Establishments (CNES - Cadastro Nacional de Estabelecimentos de Saúde) Value Object.
 * Conforms to DATASUS rules and SBIS ECF.17.16 / ECF.10.04 requirements.
 * Composed of exactly 7 numeric digits.
 */
export class Cnes extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes CNES by stripping non-numeric characters.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    return raw.replace(/\D/g, '');
  }

  /**
   * Validates if raw string constitutes a valid 7-digit CNES.
   */
  public static isValid(raw: string): boolean {
    const cleaned = this.clean(raw);
    return /^\d{7}$/.test(cleaned) && cleaned !== '0000000';
  }

  /**
   * Formats/normalizes CNES to 7 numeric digits (zero-padded if needed up to 7).
   */
  public static format(raw: string): string {
    const cleaned = this.clean(raw).slice(0, 7);
    return cleaned;
  }

  /**
   * Factory method to create an immutable CNES Value Object.
   */
  public static create(raw: string): Cnes {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('cnes', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Cnes(cleaned);
  }

  public get formatted(): string {
    return this._value;
  }
}

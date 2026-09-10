import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Value Object representing a Brazilian RG (Registro Geral de Identificação Civil).
 * Normalizes alphanumeric characters, strips formatting, and enforces length constraints.
 */
export class Rg extends ValueObject<string> {
  private static readonly RG_CLEAN_REGEX = /[^a-zA-Z0-9]/g;

  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes input by removing non-alphanumeric symbols and converting to uppercase.
   */
  public static clean(raw: string | null | undefined): string {
    return (raw || '').replace(this.RG_CLEAN_REGEX, '').toUpperCase();
  }

  /**
   * Validates whether raw input is a plausible Brazilian RG.
   * State RGs range between 5 and 14 alphanumeric characters.
   */
  public static isValid(raw: string | null | undefined): boolean {
    const cleaned = this.clean(raw);
    if (cleaned.length < 5 || cleaned.length > 14) {
      return false;
    }

    // Reject repetitive sequences (e.g., 0000000, 1111111)
    if (/^([a-zA-Z0-9])\1+$/.test(cleaned)) {
      return false;
    }

    return true;
  }

  /**
   * Factory method to create a validated Rg instance.
   * Throws ValidationError if RG format is invalid.
   */
  public static create(raw: string): Rg {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('rg', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Rg(cleaned);
  }

  /**
   * Formats 9-character RGs to standard mask (00.000.000-X), otherwise returns cleaned value.
   */
  public format(): string {
    if (this._value.length === 9) {
      return this._value.replace(/^(\w{2})(\w{3})(\w{3})(\w{1})$/, '$1.$2.$3-$4');
    }
    return this._value;
  }

  /**
   * Returns clean string value.
   */
  public toString(): string {
    return this._value;
  }
}

import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Brazilian Phone Value Object (Telefone Fixo / Celular).
 * Conforms to Anatel standards:
 * - 10 digits: (XX) [2-5]XXX-XXXX (landline)
 * - 11 digits: (XX) 9XXXX-XXXX (mobile)
 * Valid DDD codes range between 11 and 99 (first and second digits != 0).
 */
export class Phone extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes phone by stripping non-numeric characters.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    return raw.replace(/\D/g, '');
  }

  /**
   * Validates if raw string constitutes a valid Brazilian phone (10 or 11 digits with valid DDD).
   */
  public static isValid(raw: string): boolean {
    const cleaned = this.clean(raw);

    // Must be 10 digits (landline) or 11 digits (mobile)
    if (cleaned.length !== 10 && cleaned.length !== 11) {
      return false;
    }

    // DDD must be between 11 and 99, excluding XX0 (e.g. 10, 20 is not a valid DDD)
    const ddd = Number(cleaned.slice(0, 2));
    if (ddd < 11 || ddd > 99 || cleaned.charAt(1) === '0') {
      return false;
    }

    // Reject sequences where all digits are identical (e.g. 11111111111)
    if (/^(\d)\1+$/.test(cleaned)) {
      return false;
    }

    // Landline: 10 digits, starts with 2, 3, 4, or 5
    if (cleaned.length === 10) {
      const firstDigit = cleaned.charAt(2);
      return ['2', '3', '4', '5'].includes(firstDigit);
    }

    // Mobile: 11 digits, 9th digit must be 9
    if (cleaned.length === 11) {
      return cleaned.charAt(2) === '9';
    }

    return false;
  }

  /**
   * Formats phone into standard "(XX) XXXX-XXXX" or "(XX) XXXXX-XXXX".
   */
  public static format(raw: string): string {
    const cleaned = this.clean(raw).slice(0, 11);
    if (!cleaned) return '';

    if (cleaned.length <= 2) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  /**
   * Factory method to create an immutable Phone Value Object.
   */
  public static create(raw: string): Phone {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('phone', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Phone(cleaned);
  }

  public get isMobile(): boolean {
    return this._value.length === 11;
  }

  public get formatted(): string {
    return Phone.format(this._value);
  }
}

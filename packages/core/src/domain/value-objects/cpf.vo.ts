import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Value Object representing a Brazilian Individual Taxpayer Registry (CPF - Cadastro de Pessoas Físicas).
 * Enforces valid 11-digit format, mod-11 check digits, and sequence validation.
 */
export class Cpf extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * Cleans raw input by removing all non-numeric characters.
   */
  public static clean(raw: string | null | undefined): string {
    return (raw || '').replace(/\D/g, '');
  }

  /**
   * Validates if a given CPF string satisfies format, length, and check digit algorithms.
   */
  public static isValid(raw: string | null | undefined): boolean {
    const cleaned = Cpf.clean(raw);

    if (cleaned.length !== 11) {
      return false;
    }

    // Reject sequences with all identical digits (e.g. 00000000000, 11111111111)
    if (/^(\d)\1{10}$/.test(cleaned)) {
      return false;
    }

    // Mod 11 validation - First verifier digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned.charAt(i), 10) * (10 - i);
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(cleaned.charAt(9), 10)) {
      return false;
    }

    // Mod 11 validation - Second verifier digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned.charAt(i), 10) * (11 - i);
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    return digit2 === parseInt(cleaned.charAt(10), 10);
  }

  /**
   * Factory method to create a validated Cpf instance.
   * Throws ValidationError if CPF is invalid.
   */
  public static create(raw: string): Cpf {
    const cleaned = Cpf.clean(raw);
    if (!Cpf.isValid(cleaned)) {
      throw new ValidationError('cpf', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Cpf(cleaned);
  }

  /**
   * Formats a raw or clean 11-digit CPF string into standard mask 000.000.000-00.
   */
  public static format(raw: string | null | undefined): string {
    const cleaned = Cpf.clean(raw);
    if (!cleaned) return '';
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return cleaned.replace(/(\d{3})(\d+)/, '$1.$2');
    if (cleaned.length <= 9) return cleaned.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    return cleaned.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  }

  /**
   * Returns formatted mask string representation (000.000.000-00).
   */
  public format(): string {
    return Cpf.format(this._value);
  }

  /**
   * Returns clean 11-digit string.
   */
  public toString(): string {
    return this._value;
  }
}

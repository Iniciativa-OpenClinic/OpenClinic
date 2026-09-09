import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Cartão Nacional de Saúde (CNS) Value Object.
 * Conforms to Ministério da Saúde / DATASUS rules and SBIS ECF.17.16 requirement.
 * CNS has 15 numeric digits and can be either definitive (starts with 1 or 2)
 * or provisional/foreign (starts with 7, 8, or 9).
 */
export class Cns extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes CNS by stripping non-numeric characters.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    return raw.replace(/\D/g, '');
  }

  /**
   * Validates a CNS using the official Ministério da Saúde (DATASUS) Modulo 11 check.
   */
  public static isValid(raw: string): boolean {
    const cleaned = this.clean(raw);
    if (cleaned.length !== 15) {
      return false;
    }

    const firstDigit = cleaned.charAt(0);

    // Definitive CNS: starts with 1 or 2
    if (firstDigit === '1' || firstDigit === '2') {
      return this.validateDefinitiveCns(cleaned);
    }

    // Provisional / foreign CNS: starts with 7, 8, or 9
    if (firstDigit === '7' || firstDigit === '8' || firstDigit === '9') {
      return this.validateProvisionalCns(cleaned);
    }

    return false;
  }

  /**
   * Validates a definitive CNS (starts with 1 or 2) derived from PIS/PASEP.
   */
  private static validateDefinitiveCns(cns: string): boolean {
    const pis = cns.substring(0, 11);
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += Number(pis.charAt(i)) * (15 - i);
    }

    let remainder = sum % 11;
    let dv = 11 - remainder;
    if (dv === 11) dv = 0;

    let expected = '';
    if (dv === 10) {
      const sum2 = sum + 2;
      remainder = sum2 % 11;
      dv = 11 - remainder;
      expected = `${pis}001${dv}`;
    } else {
      expected = `${pis}000${dv}`;
    }

    return cns === expected;
  }

  /**
   * Validates a provisional CNS (starts with 7, 8, or 9).
   */
  private static validateProvisionalCns(cns: string): boolean {
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += Number(cns.charAt(i)) * (15 - i);
    }
    return sum % 11 === 0;
  }

  /**
   * Formats a 15-digit CNS into the standard group presentation "000 0000 0000 0000".
   */
  public static format(raw: string): string {
    const cleaned = this.clean(raw).slice(0, 15);
    if (!cleaned) return '';

    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 11) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7, 11)} ${cleaned.slice(11)}`;
  }

  /**
   * Factory method to create an immutable CNS Value Object.
   */
  public static create(raw: string): Cns {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('cns', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Cns(cleaned);
  }

  public get formatted(): string {
    return Cns.format(this._value);
  }
}

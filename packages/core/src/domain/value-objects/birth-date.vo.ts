import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Value Object representing a clinical Birth Date (Data de Nascimento).
 * Enforces calendar validity, prevents future dates, and bounds max age to 120 years.
 * Internally stored in normalized ISO 8601 format (YYYY-MM-DD).
 */
export class BirthDate extends ValueObject<string> {
  public static readonly MAX_AGE_YEARS = 120;
  private static readonly ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
  private static readonly BR_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

  private constructor(isoDate: string) {
    super(isoDate);
  }

  /**
   * Normalizes an input (Date or string in YYYY-MM-DD / DD/MM/YYYY) into ISO YYYY-MM-DD.
   */
  public static clean(raw: string | Date | null | undefined): string {
    if (!raw) return '';
    if (raw instanceof Date) {
      if (isNaN(raw.getTime())) return '';
      const year = raw.getUTCFullYear();
      const month = String(raw.getUTCMonth() + 1).padStart(2, '0');
      const day = String(raw.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const trimmed = raw.trim();
    if (this.ISO_DATE_REGEX.test(trimmed)) {
      return trimmed;
    }

    const brMatch = this.BR_DATE_REGEX.exec(trimmed);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      return `${year}-${month}-${day}`;
    }

    return '';
  }

  /**
   * Validates calendar correctness, checks that the date is not in the future,
   * and verifies that age does not exceed the maximum human lifespan bound (120 years).
   */
  public static isValid(raw: string | Date | null | undefined, referenceDate: Date = new Date()): boolean {
    const cleaned = this.clean(raw);
    if (!cleaned) return false;

    const match = this.ISO_DATE_REGEX.exec(cleaned);
    if (!match) return false;

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }

    // Validate actual days in month and leap years via UTC Date
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      return false;
    }

    const refYear = referenceDate.getUTCFullYear();
    const refMonth = referenceDate.getUTCMonth();
    const refDay = referenceDate.getUTCDate();
    const todayUtc = new Date(Date.UTC(refYear, refMonth, refDay));

    // Reject future birth dates
    if (parsedDate.getTime() > todayUtc.getTime()) {
      return false;
    }

    // Reject dates older than MAX_AGE_YEARS (120 years)
    const minAllowedDate = new Date(Date.UTC(refYear - this.MAX_AGE_YEARS, refMonth, refDay));
    if (parsedDate.getTime() < minAllowedDate.getTime()) {
      return false;
    }

    return true;
  }

  /**
   * Factory method to create a validated BirthDate instance.
   * Throws ValidationError if the date is invalid, in the future, or exceeds 120 years.
   */
  public static create(raw: string | Date, referenceDate: Date = new Date()): BirthDate {
    if (!this.isValid(raw, referenceDate)) {
      throw new ValidationError('birth_date', ErrorCode.VALIDATION_ERROR, { value: String(raw) });
    }
    const cleaned = this.clean(raw);
    return new BirthDate(cleaned);
  }

  /**
   * Creates a BirthDate from a native Date object.
   */
  public static from(date: Date, referenceDate: Date = new Date()): BirthDate {
    return this.create(date, referenceDate);
  }

  /**
   * Calculates the current age in completed years relative to a reference date.
   */
  public ageInYears(referenceDate: Date = new Date()): number {
    const match = BirthDate.ISO_DATE_REGEX.exec(this._value);
    if (!match) return 0;

    const birthYear = parseInt(match[1], 10);
    const birthMonth = parseInt(match[2], 10) - 1;
    const birthDay = parseInt(match[3], 10);

    const refYear = referenceDate.getUTCFullYear();
    const refMonth = referenceDate.getUTCMonth();
    const refDay = referenceDate.getUTCDate();

    let age = refYear - birthYear;
    if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
      age--;
    }

    return Math.max(0, age);
  }

  /**
   * Checks whether the patient is considered a minor (under 18 years old).
   */
  public isMinor(referenceDate: Date = new Date()): boolean {
    return this.ageInYears(referenceDate) < 18;
  }

  /**
   * Returns formatted date representation (DD/MM/YYYY).
   */
  public format(): string {
    const [year, month, day] = this._value.split('-');
    return `${day}/${month}/${year}`;
  }

  /**
   * Converts the value object to a native UTC Date instance.
   */
  public toDate(): Date {
    const [year, month, day] = this._value.split('-').map((v) => parseInt(v, 10));
    return new Date(Date.UTC(year, month - 1, day));
  }

  /**
   * Returns normalized ISO string (YYYY-MM-DD).
   */
  public toString(): string {
    return this._value;
  }
}

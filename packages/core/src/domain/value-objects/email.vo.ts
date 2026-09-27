import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Email Address Value Object.
 * Enforces normalized lowercase format and robust RFC 5322 regex validation.
 */
export class Email extends ValueObject<string> {
  // Robust standard email regex
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes email by trimming and converting to lowercase.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    return raw.trim().toLowerCase();
  }

  /**
   * Validates if raw string constitutes a valid email format.
   */
  public static isValid(raw: string): boolean {
    const cleaned = this.clean(raw);
    if (!cleaned || cleaned.length > 254) {
      return false;
    }
    return this.EMAIL_REGEX.test(cleaned);
  }

  /**
   * Factory method to create an immutable Email Value Object.
   */
  public static create(raw: string): Email {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('email', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Email(cleaned);
  }

  /**
   * Returns domain part of the email.
   */
  public get domain(): string {
    return this._value.split('@')[1];
  }

  /**
   * Returns local part (user) of the email.
   */
  public get localPart(): string {
    return this._value.split('@')[0];
  }
}

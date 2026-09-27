import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Value Object representing a system Username.
 * Enforces canonical lowercase normalization, minimum/maximum length (3-50 chars),
 * and safe alphanumeric characters with dot, underscore, or hyphen separators.
 */
export class Username extends ValueObject<string> {
  public static readonly MIN_LENGTH = 3;
  public static readonly MAX_LENGTH = 50;

  // Starts and ends with alphanumeric. Internal characters can include '.', '_', '-' but not consecutively.
  private static readonly USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._-]{1,48}[a-z0-9])?$/;
  private static readonly CONSECUTIVE_SEPARATORS = /[._-]{2,}/;

  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes username by trimming and converting to lowercase.
   */
  public static clean(raw: string | null | undefined): string {
    return (raw || '').trim().toLowerCase();
  }

  /**
   * Validates whether a raw string constitutes an acceptable username.
   */
  public static isValid(raw: string | null | undefined): boolean {
    const cleaned = this.clean(raw);
    if (cleaned.length < this.MIN_LENGTH || cleaned.length > this.MAX_LENGTH) {
      return false;
    }

    if (this.CONSECUTIVE_SEPARATORS.test(cleaned)) {
      return false;
    }

    return this.USERNAME_REGEX.test(cleaned);
  }

  /**
   * Factory method to create a validated and canonical Username instance.
   * Throws ValidationError if username does not satisfy domain invariants.
   */
  public static create(raw: string): Username {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('username', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Username(cleaned);
  }

  /**
   * Returns canonical username string.
   */
  public toString(): string {
    return this._value;
  }
}

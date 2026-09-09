import { ValueObject } from './value-object.base.js';
import { ValidationError, DomainError, ErrorCode } from '../../errors/index.js';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Domain policy enforcing password complexity rules according to OWASP / NIST standards.
 * Evaluates candidate plaintext passwords at registration or password change boundaries.
 * Pure domain logic safely usable in both browser (frontend) and server (backend).
 */
export class PasswordPolicy {
  public static readonly MIN_LENGTH = 8;
  public static readonly MAX_LENGTH = 128;

  private static readonly UPPERCASE_REGEX = /[A-Z]/;
  private static readonly LOWERCASE_REGEX = /[a-z]/;
  private static readonly DIGIT_REGEX = /[0-9]/;
  private static readonly SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~` ]/;

  /**
   * Evaluates candidate password against complexity policies and returns failure reasons.
   */
  public static validate(candidate: string | null | undefined): PasswordValidationResult {
    const errors: string[] = [];

    if (!candidate || typeof candidate !== 'string') {
      return { valid: false, errors: ['Password cannot be empty'] };
    }

    if (candidate.length < this.MIN_LENGTH) {
      errors.push(`Password must contain at least ${this.MIN_LENGTH} characters`);
    }

    if (candidate.length > this.MAX_LENGTH) {
      errors.push(`Password cannot exceed ${this.MAX_LENGTH} characters`);
    }

    if (!this.UPPERCASE_REGEX.test(candidate)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!this.LOWERCASE_REGEX.test(candidate)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!this.DIGIT_REGEX.test(candidate)) {
      errors.push('Password must contain at least one digit');
    }

    if (!this.SPECIAL_CHAR_REGEX.test(candidate)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Fast boolean check whether candidate password passes policy.
   */
  public static isValid(candidate: string | null | undefined): boolean {
    return this.validate(candidate).valid;
  }

  /**
   * Asserts password validity. Throws ValidationError if invalid.
   */
  public static assertValid(candidate: string | null | undefined): void {
    const result = this.validate(candidate);
    if (!result.valid) {
      throw new ValidationError('password', ErrorCode.VALIDATION_ERROR, { reasons: result.errors });
    }
  }
}

/**
 * Value Object representing an immutable, safely stored password hash (Argon2id).
 * Guarantees that only valid cryptographic hashes exist on entity models.
 * Automatically masks value in toString() and toJSON() to prevent credential exposure in logs.
 * Pure domain representation decoupled from server-side Node.js crypto binaries.
 */
export class HashedPassword extends ValueObject<string> {
  private static readonly ARGON2_PREFIX = '$argon2id$';
  private static readonly PROTECTED_MASK = '[PROTECTED]';

  private constructor(hash: string) {
    super(hash);
  }

  /**
   * Validates if a raw string is formatted as an Argon2id password hash.
   */
  public static isValidHash(hash: string | null | undefined): boolean {
    if (!hash || typeof hash !== 'string') {
      return false;
    }
    return hash.startsWith(this.ARGON2_PREFIX) && hash.length >= 30;
  }

  /**
   * Constructs a HashedPassword instance from an existing database hash.
   * Throws DomainError if the string is not an Argon2id hash.
   */
  public static fromHash(hash: string): HashedPassword {
    if (!this.isValidHash(hash)) {
      throw new DomainError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid password hash: Value must be an Argon2id cryptographic hash.'
      );
    }
    return new HashedPassword(hash);
  }

  /**
   * Retrieves the raw cryptographic hash for persistence layer mappings (e.g. database insert/update).
   */
  public getSafeHash(): string {
    return this._value;
  }

  /**
   * Strict protection against accidental log or serialization leaks.
   */
  public toJSON(): string {
    return HashedPassword.PROTECTED_MASK;
  }

  /**
   * Strict protection against accidental log or serialization leaks.
   */
  public toString(): string {
    return HashedPassword.PROTECTED_MASK;
  }
}

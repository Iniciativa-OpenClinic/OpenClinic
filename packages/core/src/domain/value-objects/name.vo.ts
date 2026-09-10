import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Value Object representing a personal or display name (Nome Completo / Nome Social / Nome de Exibição).
 * Normalizes redundant whitespaces, enforces length boundaries (2 to 120 characters),
 * and provides helper getters for first name, last name, initials, and shortened display name.
 */
export class Name extends ValueObject<string> {
  public static readonly MIN_LENGTH = 2;
  public static readonly MAX_LENGTH = 120;

  // Unicode-aware regex matching names with letters, accents, spaces, apostrophes, and hyphens.
  private static readonly NAME_REGEX = /^[\p{L}][\p{L}\s'.-]{0,118}[\p{L}.]$/u;

  private static readonly MULTIPLE_SPACES_REGEX = /\s+/g;
  private static readonly LOWERCASE_CONNECTORS = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'van', 'von']);

  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes input by collapsing multiple spaces and trimming.
   */
  public static clean(raw: string | null | undefined): string {
    if (!raw) return '';
    return raw.replace(this.MULTIPLE_SPACES_REGEX, ' ').trim();
  }

  /**
   * Validates whether raw input satisfies human name constraints.
   */
  public static isValid(raw: string | null | undefined): boolean {
    const cleaned = this.clean(raw);
    if (cleaned.length < this.MIN_LENGTH || cleaned.length > this.MAX_LENGTH) {
      return false;
    }
    return this.NAME_REGEX.test(cleaned);
  }

  /**
   * Factory method to create a validated Name instance.
   * Throws ValidationError if name does not satisfy length or character rules.
   */
  public static create(raw: string): Name {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('name', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Name(cleaned);
  }

  /**
   * Returns the first name.
   */
  public get firstName(): string {
    return this._value.split(' ')[0];
  }

  /**
   * Returns the surname / last name (or empty string if single name).
   */
  public get lastName(): string {
    const parts = this._value.split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Returns a clean, concise display name for UI presentation (First Name + Last Name).
   */
  public get displayName(): string {
    const parts = this._value.split(' ');
    if (parts.length <= 2) {
      return this._value;
    }
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }

  /**
   * Returns uppercase initials (e.g. 'Carlos Alberto Silva' -> 'CAS').
   */
  public get initials(): string {
    return this._value
      .split(' ')
      .filter((word) => !Name.LOWERCASE_CONNECTORS.has(word.toLowerCase()))
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Returns a title-cased representation respecting language connectors (e.g. 'da', 'de', 'dos').
   * Useful when input arrives all uppercase or lowercase.
   */
  public toTitleCase(): string {
    return this._value
      .split(' ')
      .map((word, index) => {
        const lower = word.toLowerCase();
        if (index > 0 && Name.LOWERCASE_CONNECTORS.has(lower)) {
          return lower;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Returns string representation.
   */
  public toString(): string {
    return this._value;
  }
}

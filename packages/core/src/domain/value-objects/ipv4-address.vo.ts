import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * IPv4 Address Value Object.
 * Enforces canonical dotted-decimal representation (RFC 791).
 * Validates 4 numerical octets in range 0-255 with no leading zeros (except '0' itself).
 */
export class IPv4Address extends ValueObject<string> {
  private static readonly OCTET_REGEX = /^(0|[1-9]\d{0,2})$/;

  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes IPv4 by trimming surrounding whitespace.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    return raw.trim();
  }

  /**
   * Validates if raw string constitutes a valid IPv4 address.
   */
  public static isValid(raw: string): boolean {
    if (!raw) return false;
    const cleaned = this.clean(raw);
    const parts = cleaned.split('.');
    if (parts.length !== 4) return false;

    for (const part of parts) {
      if (!this.OCTET_REGEX.test(part)) return false;
      const num = Number(part);
      if (num < 0 || num > 255) return false;
    }
    return true;
  }

  /**
   * Factory method to instantiate an immutable IPv4Address Value Object.
   */
  public static create(raw: string): IPv4Address {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('ip_address', ErrorCode.VALIDATION_ERROR, {
        value: raw,
        reason: 'Invalid IPv4 address format',
      });
    }
    return new IPv4Address(cleaned);
  }

  /**
   * Factory method that creates an IPv4Address if a non-empty string is provided,
   * or returns null if input is undefined, null, or whitespace.
   */
  public static createOptional(raw?: string | null): IPv4Address | null {
    if (raw === undefined || raw === null || raw.trim() === '') {
      return null;
    }
    return this.create(raw);
  }

  /**
   * Returns numerical representation of the 4 octets.
   */
  public get octets(): readonly [number, number, number, number] {
    const parts = this._value.split('.').map(Number);
    return [parts[0], parts[1], parts[2], parts[3]];
  }

  /**
   * Checks if address resides in loopback range (127.0.0.0/8).
   */
  public isLoopback(): boolean {
    return this.octets[0] === 127;
  }

  /**
   * Checks if address is private according to RFC 1918:
   * - 10.0.0.0/8
   * - 172.16.0.0/12
   * - 192.168.0.0/16
   */
  public isPrivate(): boolean {
    const [first, second] = this.octets;
    if (first === 10) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    return false;
  }

  /**
   * Checks if address is link-local (169.254.0.0/16).
   */
  public isLinkLocal(): boolean {
    const [first, second] = this.octets;
    return first === 169 && second === 254;
  }

  /**
   * Checks if address is broadcast (255.255.255.255).
   */
  public isBroadcast(): boolean {
    return this._value === '255.255.255.255';
  }
}

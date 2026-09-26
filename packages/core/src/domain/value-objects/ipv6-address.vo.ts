import { ValueObject } from './value-object.base.js';
import { IPv4Address } from './ipv4-address.vo.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * IPv6 Address Value Object.
 * Enforces RFC 4291 / RFC 5952 compliance.
 * Supports standard 8-group notation, '::' zero compression, and IPv4-mapped IPv6 addresses.
 */
export class IPv6Address extends ValueObject<string> {
  private static readonly HEX_GROUP_REGEX = /^[0-9a-fA-F]{1,4}$/;

  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes IPv6 address by trimming whitespace and converting to lowercase.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    return raw.trim().toLowerCase();
  }

  /**
   * Validates if raw string constitutes a valid IPv6 address.
   */
  public static isValid(raw: string): boolean {
    if (!raw) return false;
    const cleaned = this.clean(raw);
    if (!cleaned) return false;

    // Reject invalid character sequences
    if (/[^0-9a-f:.]/i.test(cleaned)) {
      return false;
    }

    // Must contain colons
    if (!cleaned.includes(':')) {
      return false;
    }

    // Check for double colons '::'
    const doubleColonCount = (cleaned.match(/::/g) || []).length;
    if (doubleColonCount > 1) return false;

    if (doubleColonCount === 1) {
      const [left, right] = cleaned.split('::');
      const leftParts = left ? left.split(':') : [];
      const rightParts = right ? right.split(':') : [];

      const allParts = [...leftParts, ...rightParts];
      const hasIPv4Tail = allParts.length > 0 && allParts[allParts.length - 1].includes('.');

      let maxAllowedParts = 7;
      if (hasIPv4Tail) {
        const ipv4Part = allParts.pop()!;
        if (!IPv4Address.isValid(ipv4Part)) return false;
        maxAllowedParts = 6;
      }

      if (allParts.length > maxAllowedParts) return false;

      for (const part of allParts) {
        if (!this.HEX_GROUP_REGEX.test(part)) return false;
      }

      return true;
    }

    // No '::' compression
    const parts = cleaned.split(':');
    const hasIPv4Tail = parts.length > 0 && parts[parts.length - 1].includes('.');

    if (hasIPv4Tail) {
      if (parts.length !== 7) return false; // 6 hex groups + 1 IPv4 group
      const ipv4Part = parts[6];
      if (!IPv4Address.isValid(ipv4Part)) return false;
      for (let i = 0; i < 6; i++) {
        if (!this.HEX_GROUP_REGEX.test(parts[i])) return false;
      }
      return true;
    }

    if (parts.length !== 8) return false;
    for (const part of parts) {
      if (!this.HEX_GROUP_REGEX.test(part)) return false;
    }

    return true;
  }

  /**
   * Factory method to instantiate an immutable IPv6Address Value Object.
   */
  public static create(raw: string): IPv6Address {
    const cleaned = this.clean(raw);
    if (!this.isValid(cleaned)) {
      throw new ValidationError('ip_address', ErrorCode.VALIDATION_ERROR, {
        value: raw,
        reason: 'Invalid IPv6 address format',
      });
    }
    return new IPv6Address(cleaned);
  }

  /**
   * Factory method that creates an IPv6Address if a non-empty string is provided,
   * or returns null if input is undefined, null, or whitespace.
   */
  public static createOptional(raw?: string | null): IPv6Address | null {
    if (raw === undefined || raw === null || raw.trim() === '') {
      return null;
    }
    return this.create(raw);
  }

  /**
   * Checks if address is loopback (::1 or expanded 0:0:0:0:0:0:0:1).
   */
  public isLoopback(): boolean {
    if (this._value === '::1') return true;
    const parts = this.expandedGroups();
    return parts.slice(0, 7).every((p) => p === 0) && parts[7] === 1;
  }

  /**
   * Checks if address is unspecified (:: or all 0s).
   */
  public isUnspecified(): boolean {
    if (this._value === '::') return true;
    return this.expandedGroups().every((p) => p === 0);
  }

  /**
   * Checks if address is link-local (fe80::/10).
   */
  public isLinkLocal(): boolean {
    const firstGroup = this.expandedGroups()[0];
    // 0xfe80 to 0xfebf (fe80::/10)
    return firstGroup >= 0xfe80 && firstGroup <= 0xfebf;
  }

  /**
   * Checks if address is an IPv4-mapped IPv6 address (::ffff:x.x.x.x).
   */
  public isIPv4Mapped(): boolean {
    return this._value.startsWith('::ffff:') || this._value.startsWith('0:0:0:0:0:ffff:');
  }

  /**
   * Extracts embedded IPv4 address if this is an IPv4-mapped IPv6 address.
   */
  public toIPv4Mapped(): IPv4Address | null {
    if (!this.isIPv4Mapped()) return null;
    const lastColonIndex = this._value.lastIndexOf(':');
    const tail = this._value.slice(lastColonIndex + 1);
    if (IPv4Address.isValid(tail)) {
      return IPv4Address.create(tail);
    }
    return null;
  }

  /**
   * Expands the address into 8 16-bit numerical groups.
   */
  private expandedGroups(): number[] {
    const cleaned = this._value;
    let parts: string[];

    if (cleaned.includes('::')) {
      const [left, right] = cleaned.split('::');
      const leftParts = left ? left.split(':') : [];
      let rightParts = right ? right.split(':') : [];

      if (rightParts.length > 0 && rightParts[rightParts.length - 1].includes('.')) {
        const ipv4Part = rightParts.pop()!;
        const octets = ipv4Part.split('.').map(Number);
        rightParts.push(((octets[0] << 8) | octets[1]).toString(16));
        rightParts.push(((octets[2] << 8) | octets[3]).toString(16));
      }

      const missingCount = 8 - (leftParts.length + rightParts.length);
      const middle = Array<string>(missingCount).fill('0');
      parts = [...leftParts, ...middle, ...rightParts];
    } else {
      parts = cleaned.split(':');
      if (parts.length === 7 && parts[6].includes('.')) {
        const ipv4Part = parts.pop()!;
        const octets = ipv4Part.split('.').map(Number);
        parts.push(((octets[0] << 8) | octets[1]).toString(16));
        parts.push(((octets[2] << 8) | octets[3]).toString(16));
      }
    }

    return parts.map((p) => parseInt(p, 16) || 0);
  }
}

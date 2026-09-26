import { ValueObject } from './value-object.base.js';
import { IPv4Address } from './ipv4-address.vo.js';
import { IPv6Address } from './ipv6-address.vo.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

export type IpVersion = 'IPv4' | 'IPv6';

/**
 * Unified IP Address Value Object.
 * Encapsulates both IPv4 (RFC 791) and IPv6 (RFC 4291 / RFC 5952) addresses.
 * Provides polymorphic version resolution, immutability, and security validations.
 */
export class IpAddress extends ValueObject<string> {
  private readonly _version: IpVersion;
  private readonly _delegate: IPv4Address | IPv6Address;

  private constructor(value: string, version: IpVersion, delegate: IPv4Address | IPv6Address) {
    super(value);
    this._version = version;
    this._delegate = delegate;
  }

  /**
   * Sanitizes IP address string by trimming whitespace and lowercasing if IPv6.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (trimmed.includes(':')) {
      return IPv6Address.clean(trimmed);
    }
    return IPv4Address.clean(trimmed);
  }

  /**
   * Validates whether raw string constitutes a valid IPv4 or IPv6 address.
   */
  public static isValid(raw: string): boolean {
    if (!raw) return false;
    return IPv4Address.isValid(raw) || IPv6Address.isValid(raw);
  }

  /**
   * Factory method to create an immutable IpAddress Value Object.
   */
  public static create(raw: string): IpAddress {
    if (IPv4Address.isValid(raw)) {
      const ipv4 = IPv4Address.create(raw);
      return new IpAddress(ipv4.value, 'IPv4', ipv4);
    }

    if (IPv6Address.isValid(raw)) {
      const ipv6 = IPv6Address.create(raw);
      return new IpAddress(ipv6.value, 'IPv6', ipv6);
    }

    throw new ValidationError('ip_address', ErrorCode.VALIDATION_ERROR, {
      value: raw,
      reason: 'Must be a valid IPv4 or IPv6 address',
    });
  }

  /**
   * Factory method that creates an IpAddress if a non-empty string is provided,
   * or returns null if input is undefined, null, or whitespace.
   */
  public static createOptional(raw?: string | null): IpAddress | null {
    if (raw === undefined || raw === null || raw.trim() === '') {
      return null;
    }
    return this.create(raw);
  }

  /**
   * Returns detected IP protocol version ('IPv4' or 'IPv6').
   */
  public get version(): IpVersion {
    return this._version;
  }

  /**
   * Checks if this is an IPv4 address.
   */
  public isIPv4(): boolean {
    return this._version === 'IPv4';
  }

  /**
   * Checks if this is an IPv6 address.
   */
  public isIPv6(): boolean {
    return this._version === 'IPv6';
  }

  /**
   * Checks if address is loopback (127.0.0.0/8 or ::1).
   */
  public isLoopback(): boolean {
    return this._delegate.isLoopback();
  }

  /**
   * Checks if address is in a private network range.
   */
  public isPrivate(): boolean {
    if (this.isIPv4()) {
      return (this._delegate as IPv4Address).isPrivate();
    }
    // IPv6 link-local or unique local addresses (fc00::/7)
    return (this._delegate as IPv6Address).isLinkLocal();
  }

  /**
   * Returns underlying IPv4Address if version is IPv4, or mapped IPv4 if available.
   */
  public toIPv4(): IPv4Address | null {
    if (this.isIPv4()) {
      return this._delegate as IPv4Address;
    }
    return (this._delegate as IPv6Address).toIPv4Mapped();
  }

  /**
   * Returns underlying IPv6Address if version is IPv6.
   */
  public toIPv6(): IPv6Address | null {
    if (this.isIPv6()) {
      return this._delegate as IPv6Address;
    }
    return null;
  }
}

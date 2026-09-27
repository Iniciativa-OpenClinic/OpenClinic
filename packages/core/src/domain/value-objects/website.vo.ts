import { ValueObject } from './value-object.base.js';
import { ValidationError, ErrorCode } from '../../errors/index.js';

/**
 * Website Value Object.
 * Enforces secure, standardized HTTP/HTTPS URL format and prevents malicious schemes.
 */
export class Website extends ValueObject<string> {
  // Regex validating standard domain name format (alphanumeric labels separated by dots)
  private static readonly DOMAIN_REGEX =
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  private constructor(value: string) {
    super(value);
  }

  /**
   * Sanitizes and normalizes a website URL.
   * Trims whitespace, auto-prefixes https:// if no protocol was supplied,
   * normalizes hostname to lowercase, and strips redundant trailing slash on root URLs.
   */
  public static clean(raw: string): string {
    if (!raw) return '';
    let trimmed = raw.trim();
    if (!trimmed) return '';

    // If no scheme was provided, default to https://
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }

    try {
      const parsed = new URL(trimmed);
      parsed.protocol = parsed.protocol.toLowerCase();
      parsed.hostname = parsed.hostname.toLowerCase();

      let result = parsed.toString();
      // Remove trailing slash on root URL without query string or hash
      if (result.endsWith('/') && parsed.pathname === '/' && !parsed.search && !parsed.hash) {
        result = result.slice(0, -1);
      }
      return result;
    } catch {
      return raw.trim();
    }
  }

  /**
   * Validates whether raw string represents a valid, safe HTTP or HTTPS website URL.
   */
  public static isValid(raw: string): boolean {
    if (!raw || !raw.trim()) return false;
    const trimmed = raw.trim();

    // Explicitly reject dangerous or unauthorized schemes
    if (/^(javascript|data|vbscript|file|ftp):/i.test(trimmed)) {
      return false;
    }

    const cleaned = this.clean(trimmed);
    if (cleaned.length > 2048) {
      return false;
    }

    try {
      const parsed = new URL(cleaned);

      // Only http and https protocols are allowed for web presence
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      const host = parsed.hostname;
      if (!host) return false;

      // Allow localhost for local development environments
      if (host === 'localhost' || host === '127.0.0.1') {
        return true;
      }

      // Validate standard internet domain structure
      return this.DOMAIN_REGEX.test(host);
    } catch {
      return false;
    }
  }

  /**
   * Factory method to create an immutable Website Value Object.
   */
  public static create(raw: string): Website {
    if (!this.isValid(raw)) {
      throw new ValidationError('website', ErrorCode.VALIDATION_ERROR, { value: raw });
    }
    return new Website(this.clean(raw));
  }

  /**
   * Returns hostname of the website URL (e.g. 'www.example.com').
   */
  public get hostname(): string {
    return new URL(this._value).hostname;
  }

  /**
   * Returns protocol of the website URL (e.g. 'https:').
   */
  public get protocol(): string {
    return new URL(this._value).protocol;
  }

  /**
   * Returns origin of the website URL (e.g. 'https://www.example.com').
   */
  public get origin(): string {
    return new URL(this._value).origin;
  }
}

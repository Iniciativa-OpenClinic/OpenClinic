import { describe, it, expect } from 'vitest';
import {
  isValidCallingCode,
  formatCallingCode,
  isPhoneValid,
  formatPhone,
} from '../src/arch/utils/phone.utils.js';

describe('phone.utils (Google libphonenumber-js)', () => {
  describe('isValidCallingCode', () => {
    it('should validate standard international calling codes (DDIs)', () => {
      expect(isValidCallingCode('+55')).toBe(true); // Brazil
      expect(isValidCallingCode('55')).toBe(true);
      expect(isValidCallingCode('+1')).toBe(true); // USA / Canada
      expect(isValidCallingCode('1')).toBe(true);
      expect(isValidCallingCode('+351')).toBe(true); // Portugal
      expect(isValidCallingCode('+34')).toBe(true); // Spain
      expect(isValidCallingCode('+44')).toBe(true); // UK
      expect(isValidCallingCode('+49')).toBe(true); // Germany
      expect(isValidCallingCode('+81')).toBe(true); // Japan
    });

    it('should reject invalid or nonexistent DDIs', () => {
      expect(isValidCallingCode('')).toBe(false);
      expect(isValidCallingCode(null)).toBe(false);
      expect(isValidCallingCode(undefined)).toBe(false);
      expect(isValidCallingCode('+0')).toBe(false);
      expect(isValidCallingCode('+9999')).toBe(false);
      expect(isValidCallingCode('abc')).toBe(false);
    });
  });

  describe('formatCallingCode', () => {
    it('should format raw strings to prefixed calling codes', () => {
      expect(formatCallingCode('55')).toBe('+55');
      expect(formatCallingCode('+55')).toBe('+55');
      expect(formatCallingCode('+1')).toBe('+1');
      expect(formatCallingCode('')).toBe('');
    });
  });

  describe('isPhoneValid & formatPhone', () => {
    it('should validate phone numbers using libphonenumber', () => {
      expect(isPhoneValid('11987654321', 'BR')).toBe(true);
      expect(isPhoneValid('+5511987654321')).toBe(true);
      expect(isPhoneValid('123', 'BR')).toBe(false);
    });

    it('should format phone numbers into international format', () => {
      const formatted = formatPhone('11987654321', 'BR');
      expect(formatted).toContain('+55');
    });
  });
});

import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';

// Pre-computed set of valid international calling codes (without '+')
const VALID_CALLING_CODES = new Set<string>();

for (const country of getCountries()) {
  try {
    const code = getCountryCallingCode(country);
    if (code) {
      VALID_CALLING_CODES.add(code);
    }
  } catch {
    // Ignore any country without metadata
  }
}

/**
 * Validates if the given DDI / international dialing code is valid according to ITU-T / Google libphonenumber.
 * Accepts formats such as "+55", "55", "+1", "1", "+351", etc.
 */
export function isValidCallingCode(ddi: string | null | undefined): boolean {
  if (!ddi) return false;
  const digits = ddi.replace(/\D/g, '');
  if (!digits || digits.length < 1 || digits.length > 4) return false;
  return VALID_CALLING_CODES.has(digits);
}

/**
 * Formats a dialing code by ensuring leading '+' and restricting to valid characters and length.
 * Example: "55" -> "+55", "+551" -> "+551"
 */
export function formatCallingCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';
  return `+${digits}`;
}

/**
 * Validates a full phone number using Google libphonenumber.
 * @param phone National or full phone string
 * @param defaultCountry ISO 3166-1 alpha-2 country code (default 'BR')
 */
export function isPhoneValid(phone: string, defaultCountry: CountryCode = 'BR'): boolean {
  if (!phone || !phone.trim()) return false;
  try {
    return isValidPhoneNumber(phone, defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Formats a phone number to standard national or international E.164 format.
 */
export function formatPhone(phone: string, defaultCountry: CountryCode = 'BR'): string {
  if (!phone || !phone.trim()) return phone;
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry);
    return parsed ? parsed.formatInternational() : phone;
  } catch {
    return phone;
  }
}

import { describe, it, expect } from 'vitest';
import {
  isValidAppVersion,
  generateCompliantPassword,
  isValidAssetUrl,
  LOGO_ALLOWED_EXTENSIONS,
  FAVICON_ALLOWED_EXTENSIONS,
} from '../src/arch/pages/PlatformSettingsView.js';
import { applyDocumentBranding } from '../src/services/api.js';

describe('PlatformSettings validations and security utilities', () => {
  describe('isValidAppVersion (SemVer up to 99.999.99999)', () => {
    it('should accept valid semantic version strings', () => {
      expect(isValidAppVersion('1.0.0')).toBe(true);
      expect(isValidAppVersion('0.1.0')).toBe(true);
      expect(isValidAppVersion('2.15.300')).toBe(true);
      expect(isValidAppVersion('99.999.99999')).toBe(true);
      expect(isValidAppVersion('1.0.0-beta.1')).toBe(true);
      expect(isValidAppVersion('1.0.0-rc.2')).toBe(true);
    });

    it('should reject invalid or malformed version strings', () => {
      expect(isValidAppVersion('')).toBe(false);
      expect(isValidAppVersion('1')).toBe(false);
      expect(isValidAppVersion('1.0')).toBe(false);
      expect(isValidAppVersion('v1.0.0')).toBe(false);
      expect(isValidAppVersion('100.1.0')).toBe(false); // major > 99
      expect(isValidAppVersion('1.1000.0')).toBe(false); // minor > 999
      expect(isValidAppVersion('1.0.100000')).toBe(false); // patch > 99999
      expect(isValidAppVersion('1.0.0.0')).toBe(false);
      expect(isValidAppVersion('invalid-version')).toBe(false);
    });
  });

  describe('isValidAssetUrl (Logo & Favicon safety and format validation)', () => {
    it('should allow empty or whitespace string (optional field)', () => {
      expect(isValidAssetUrl('', LOGO_ALLOWED_EXTENSIONS)).toBe(true);
      expect(isValidAssetUrl('   ', LOGO_ALLOWED_EXTENSIONS)).toBe(true);
    });

    it('should accept valid relative asset paths with supported extensions', () => {
      expect(isValidAssetUrl('/logo.png', LOGO_ALLOWED_EXTENSIONS)).toBe(true);
      expect(isValidAssetUrl('/assets/images/logo.svg', LOGO_ALLOWED_EXTENSIONS)).toBe(true);
      expect(isValidAssetUrl('/favicon.ico', FAVICON_ALLOWED_EXTENSIONS)).toBe(true);
      expect(isValidAssetUrl('/favicon.png?v=2', FAVICON_ALLOWED_EXTENSIONS)).toBe(true);
    });

    it('should accept valid HTTPS/HTTP absolute URLs with supported extensions', () => {
      expect(isValidAssetUrl('https://cdn.example.com/brand/logo.png', LOGO_ALLOWED_EXTENSIONS)).toBe(true);
      expect(isValidAssetUrl('https://assets.example.org/favicon.ico', FAVICON_ALLOWED_EXTENSIONS)).toBe(true);
      expect(isValidAssetUrl('http://localhost:3000/logo.webp', LOGO_ALLOWED_EXTENSIONS)).toBe(true);
    });

    it('should reject dangerous schemes and malformed URLs', () => {
      expect(isValidAssetUrl('javascript:alert(1)', LOGO_ALLOWED_EXTENSIONS)).toBe(false);
      expect(isValidAssetUrl('data:image/png;base64,123', LOGO_ALLOWED_EXTENSIONS)).toBe(false);
      expect(isValidAssetUrl('file:///C:/logo.png', LOGO_ALLOWED_EXTENSIONS)).toBe(false);
      expect(isValidAssetUrl('ftp://example.com/logo.png', LOGO_ALLOWED_EXTENSIONS)).toBe(false);
      expect(isValidAssetUrl('not-a-url', LOGO_ALLOWED_EXTENSIONS)).toBe(false);
    });

    it('should reject paths lacking leading slash or missing/unsupported image extension', () => {
      expect(isValidAssetUrl('logo.png', LOGO_ALLOWED_EXTENSIONS)).toBe(false); // missing leading slash
      expect(isValidAssetUrl('/logo.pdf', LOGO_ALLOWED_EXTENSIONS)).toBe(false); // unsupported extension
      expect(isValidAssetUrl('/favicon.txt', FAVICON_ALLOWED_EXTENSIONS)).toBe(false); // unsupported extension
    });
  });

  describe('generateCompliantPassword (OWASP / NIST)', () => {
    it('should generate password matching length and required character sets', () => {
      const pwd = generateCompliantPassword(14, {
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      });

      expect(pwd.length).toBeGreaterThanOrEqual(14);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
      expect(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pwd)).toBe(true);
    });

    it('should enforce minimum length of at least 8 characters', () => {
      const pwd = generateCompliantPassword(4);
      expect(pwd.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('applyDocumentBranding', () => {
    it('should update document title, favicon href, and documentElement lang when document is present', () => {
      const mockLink = { rel: 'icon', href: '/favicon.png' };
      const originalDoc = (globalThis as any).document;
      (globalThis as any).document = {
        title: '',
        documentElement: { lang: '' },
        querySelector: () => mockLink,
        createElement: () => ({ rel: '', href: '' }),
        head: { appendChild: () => { } },
      };

      applyDocumentBranding('OpenClinic Title Test', '/custom-favicon.png', 'en-US');

      expect((globalThis as any).document.title).toBe('OpenClinic Title Test');
      expect((globalThis as any).document.documentElement.lang).toBe('en-US');
      expect(mockLink.href).toBe('/custom-favicon.png');

      (globalThis as any).document = originalDoc;
    });
  });

  describe('DEFAULT_PUBLIC_CONFIG_FALLBACKS resilience', () => {
    it('should provide default values for appName, appSubtitle, appDescription, and appVersion', async () => {
      const { DEFAULT_PUBLIC_CONFIG_FALLBACKS } = await import('../src/config/config.constants.js');
      expect(DEFAULT_PUBLIC_CONFIG_FALLBACKS.APP_NAME).toBe('OpenClinic');
      expect(DEFAULT_PUBLIC_CONFIG_FALLBACKS.APP_SUBTITLE).toBeTruthy();
      expect(DEFAULT_PUBLIC_CONFIG_FALLBACKS.APP_DESCRIPTION).toBeTruthy();
      expect(DEFAULT_PUBLIC_CONFIG_FALLBACKS.APP_VERSION).toBe('0.1.0');
      expect(DEFAULT_PUBLIC_CONFIG_FALLBACKS.APP_LOGO_URL).toBe('/logo.png');
      expect(DEFAULT_PUBLIC_CONFIG_FALLBACKS.APP_FAVICON_URL).toBe('/favicon.png');
    });

    it('should have valid LoginIdentifierType values matching CPF, USERNAME, EMAIL', async () => {
      const { LoginIdentifierType } = await import('@openclinic/core/shared');
      expect(LoginIdentifierType.CPF).toBe('CPF');
      expect(LoginIdentifierType.USERNAME).toBe('USERNAME');
      expect(LoginIdentifierType.EMAIL).toBe('EMAIL');
    });
  });
});


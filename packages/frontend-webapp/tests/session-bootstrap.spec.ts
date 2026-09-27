import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  refreshTokens,
  setTokens,
  clearTokens,
  getAccessToken,
  logout,
  login,
} from '../src/services/api.js';

describe('Session Bootstrap & Zero-LocalStorage Invariant', () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    }
  });

  it('refreshTokens succeeds via HttpOnly cookie when _refreshToken is null in RAM', async () => {
    // Ensure memory tokens start null
    expect(getAccessToken()).toBeNull();

    // Mock fetch for /api/v1/auth/refresh
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/api/v1/auth/refresh')) {
        expect(init.method).toBe('POST');
        expect(init.credentials).toBe('same-origin');
        // Body is empty JSON object when _refreshToken is not in RAM (cookie is used by browser, Fastify requires object schema)
        expect(init.body).toBe('{}');

        return new Response(
          JSON.stringify({
            access_token: 'header.payload-new.signature',
            token_type: 'bearer',
            expires_in: 900,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    });

    const result = await refreshTokens();

    expect(result.access_token).toBe('header.payload-new.signature');
    expect(getAccessToken()).toBe('header.payload-new.signature');
  });

  it('logout terminates session and clears in-memory tokens without requiring _refreshToken in RAM', async () => {
    setTokens('header.payload.signature', null);
    expect(getAccessToken()).toBe('header.payload.signature');

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/api/v1/auth/logout')) {
        expect(init.method).toBe('POST');
        expect(init.credentials).toBe('same-origin');
        expect(init.body).toBe('{}');
        return new Response(JSON.stringify({ code: 'LOGOUT_SUCCESS', message: 'Logged out' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    });

    await logout();

    expect(getAccessToken()).toBeNull();
  });

  it('ZERO-LOCALSTORAGE INVARIANT: tokens are strictly kept in RAM and never written to localStorage', async () => {
    const localStorageSetItemSpy = vi.fn();
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: localStorageSetItemSpy,
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/api/v1/auth/login')) {
        return new Response(
          JSON.stringify({
            access_token: 'jwt-access-token-12345',
            refresh_token: 'refresh-token-cookie-simulated',
            token_type: 'bearer',
            user: { id: 'u1', username: 'owner.test', role: 'OWNER' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    });

    await login('owner.test', 'password123');

    expect(getAccessToken()).toBe('jwt-access-token-12345');

    // Verify localStorage was NEVER called with access_token or refresh_token
    const writtenKeys = localStorageSetItemSpy.mock.calls.map((call) => call[0]);
    expect(writtenKeys).not.toContain('access_token');
    expect(writtenKeys).not.toContain('refreshToken');
    expect(writtenKeys).not.toContain('token');
    expect(writtenKeys).not.toContain('session');
    expect(writtenKeys).not.toContain('auth');
  });
});

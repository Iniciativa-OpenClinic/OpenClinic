import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAccessToken,
  decodeToken,
  AuthenticationError,
  ErrorCode,
  UserRole,
  hashToken,
} from '@openclinic/core';
import type { JwtConfig } from '@openclinic/core';
import { createAuthenticateJwt } from '../../src/arch/presentation/middlewares/authenticate-jwt.js';
import { RefreshTokenUseCase } from '../../src/arch/application/use-cases/refresh-token.use-case.js';
import { LoginUseCase } from '../../src/arch/application/use-cases/login.use-case.js';
import { LogoutUseCase } from '../../src/arch/application/use-cases/logout.use-case.js';
import type { IAMUnitOfWork } from '../../src/arch/domain/repositories.js';

describe('Session Lifecycle & Access Token Revocation Spec', () => {
  const jwtConfig: JwtConfig = {
    secretKey: 'test-jwt-secret-for-session-lifecycle-tests-must-be-long',
    accessTokenExpireMinutes: 15,
    refreshTokenExpireDays: 7,
  };

  let mockUow: any;

  beforeEach(() => {
    mockUow = {
      users: {
        getById: vi.fn(),
        getByIdentifier: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      sessions: {
        create: vi.fn(),
        findById: vi.fn(),
        findByTokenHash: vi.fn(),
        findAnyByTokenHash: vi.fn(),
        revokeIfActive: vi.fn(),
        rotate: vi.fn(),
        revoke: vi.fn().mockResolvedValue(undefined),
        revokeAllByUser: vi.fn().mockResolvedValue(undefined),
        deleteExpired: vi.fn(),
      },
      lockouts: {
        getByIdentifier: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
        reset: vi.fn().mockResolvedValue(undefined),
      },
      auditLogs: {
        create: vi.fn().mockResolvedValue({ id: 'audit-id' }),
      },
      applications: {
        getDefaultApplication: vi.fn().mockResolvedValue(null),
      },
    };
  });

  describe('P1: Access Token Revocation in authenticateJwt Middleware', () => {
    it('allows access when session is active and user is active', async () => {
      const authenticateJwt = createAuthenticateJwt(jwtConfig, mockUow as IAMUnitOfWork);

      const token = createAccessToken(
        { sub: 'user-1', role: UserRole.USER, email: 'user@clinic.local', sid: 'session-123' },
        jwtConfig
      );

      mockUow.sessions.findById.mockResolvedValue({
        id: 'session-123',
        user_id: 'user-1',
        revoked_at: null,
        expires_at: new Date(Date.now() + 86400000),
      });

      mockUow.users.getById.mockResolvedValue({
        id: 'user-1',
        role: UserRole.USER,
        is_active: true,
      });

      const request: any = {
        headers: { authorization: `Bearer ${token}` },
      };
      const reply: any = {};

      await authenticateJwt(request, reply);

      expect(request.user).toBeDefined();
      expect(request.user.sub).toBe('user-1');
      expect(request.user.sid).toBe('session-123');
    });

    it('A01: rejects token without sid with TOKEN_INVALID (401)', async () => {
      const authenticateJwt = createAuthenticateJwt(jwtConfig, mockUow as IAMUnitOfWork);

      // Synthetic token without sid
      const token = createAccessToken(
        { sub: 'user-1', role: UserRole.USER, email: 'user@clinic.local' },
        jwtConfig
      );

      mockUow.users.getById.mockResolvedValue({
        id: 'user-1',
        role: UserRole.USER,
        is_active: true,
      });

      const request: any = {
        headers: { authorization: `Bearer ${token}` },
      };
      const reply: any = {};

      await expect(authenticateJwt(request, reply)).rejects.toThrow(AuthenticationError);
      await expect(authenticateJwt(request, reply)).rejects.toMatchObject({
        code: ErrorCode.TOKEN_INVALID,
      });
      expect(mockUow.sessions.findById).not.toHaveBeenCalled();
    });

    it('A02: rejects access token with TOKEN_INVALID if sid belongs to another user', async () => {
      const authenticateJwt = createAuthenticateJwt(jwtConfig, mockUow as IAMUnitOfWork);

      // Token for user-attacker referencing victim-user session
      const token = createAccessToken(
        { sub: 'user-attacker', role: UserRole.USER, email: 'attacker@clinic.local', sid: 'victim-session-id' },
        jwtConfig
      );

      mockUow.sessions.findById.mockResolvedValue({
        id: 'victim-session-id',
        user_id: 'victim-user-id', // Different user!
        revoked_at: null,
        expires_at: new Date(Date.now() + 86400000),
      });

      const request: any = {
        headers: { authorization: `Bearer ${token}` },
      };
      const reply: any = {};

      await expect(authenticateJwt(request, reply)).rejects.toThrow(AuthenticationError);
      await expect(authenticateJwt(request, reply)).rejects.toMatchObject({
        code: ErrorCode.TOKEN_INVALID,
      });
    });

    it('rejects access token with TOKEN_INVALID if session was revoked (after logout)', async () => {
      const authenticateJwt = createAuthenticateJwt(jwtConfig, mockUow as IAMUnitOfWork);

      const token = createAccessToken(
        { sub: 'user-1', role: UserRole.USER, email: 'user@clinic.local', sid: 'session-revoked' },
        jwtConfig
      );

      mockUow.sessions.findById.mockResolvedValue({
        id: 'session-revoked',
        user_id: 'user-1',
        revoked_at: new Date(), // Revoked!
        expires_at: new Date(Date.now() + 86400000),
      });

      const request: any = {
        headers: { authorization: `Bearer ${token}` },
      };
      const reply: any = {};

      await expect(authenticateJwt(request, reply)).rejects.toThrow(AuthenticationError);
      await expect(authenticateJwt(request, reply)).rejects.toMatchObject({
        code: ErrorCode.TOKEN_INVALID,
      });
    });

    it('rejects access token with USER_DISABLED if user account was deactivated', async () => {
      const authenticateJwt = createAuthenticateJwt(jwtConfig, mockUow as IAMUnitOfWork);

      const token = createAccessToken(
        { sub: 'user-1', role: UserRole.USER, email: 'user@clinic.local', sid: 'session-123' },
        jwtConfig
      );

      mockUow.sessions.findById.mockResolvedValue({
        id: 'session-123',
        user_id: 'user-1',
        revoked_at: null,
        expires_at: new Date(Date.now() + 86400000),
      });

      mockUow.users.getById.mockResolvedValue({
        id: 'user-1',
        role: UserRole.USER,
        is_active: false, // Inactive / disabled!
      });

      const request: any = {
        headers: { authorization: `Bearer ${token}` },
      };
      const reply: any = {};

      await expect(authenticateJwt(request, reply)).rejects.toThrow(AuthenticationError);
      await expect(authenticateJwt(request, reply)).rejects.toMatchObject({
        code: ErrorCode.USER_DISABLED,
      });
    });

    it('synchronizes updated user role in token payload when privileges change', async () => {
      const authenticateJwt = createAuthenticateJwt(jwtConfig, mockUow as IAMUnitOfWork);

      const token = createAccessToken(
        { sub: 'user-1', role: UserRole.USER, email: 'user@clinic.local', sid: 'session-123' },
        jwtConfig
      );

      mockUow.sessions.findById.mockResolvedValue({
        id: 'session-123',
        user_id: 'user-1',
        revoked_at: null,
        expires_at: new Date(Date.now() + 86400000),
      });

      // Role promoted to ADMIN in database
      mockUow.users.getById.mockResolvedValue({
        id: 'user-1',
        role: UserRole.ADMIN,
        is_active: true,
      });

      const request: any = {
        headers: { authorization: `Bearer ${token}` },
      };
      const reply: any = {};

      await authenticateJwt(request, reply);

      expect(request.user.role).toBe(UserRole.ADMIN);
    });
  });

  describe('P1: Concurrent Refresh Token Rotation & Single-Winner Guarantee', () => {
    it('rotates session atomically and binds new sid to access token for single winner', async () => {
      const useCase = new RefreshTokenUseCase(mockUow as IAMUnitOfWork, jwtConfig);

      const rawRefreshToken = 'refresh-token-active-123';
      const tokenHash = hashToken(rawRefreshToken);

      mockUow.sessions.rotate.mockResolvedValue({
        oldSession: {
          id: 'session-old',
          user_id: 'user-1',
          revoked_at: new Date(),
          expires_at: new Date(Date.now() + 86400000),
          user_agent: 'Vitest Agent',
          ip_address: '127.0.0.1',
        },
        newSession: {
          id: 'session-new-456',
          user_id: 'user-1',
          revoked_at: null,
          expires_at: new Date(Date.now() + 86400000),
        },
      });

      mockUow.users.getById.mockResolvedValue({
        id: 'user-1',
        role: UserRole.ADMIN,
        email: 'admin@clinic.local',
        is_active: true,
      });

      mockUow.sessions.findById.mockResolvedValue({
        id: 'session-new-456',
        user_id: 'user-1',
        revoked_at: null,
      });

      const result = await useCase.execute(rawRefreshToken);

      expect(mockUow.sessions.rotate).toHaveBeenCalledWith(tokenHash, expect.any(Object));

      const decoded = decodeToken(result.access_token, jwtConfig);
      expect(decoded.sid).toBe('session-new-456');
      expect(decoded.sub).toBe('user-1');
      expect(decoded.role).toBe(UserRole.ADMIN);
    });

    it('rejects losing concurrent request when session is no longer active', async () => {
      const useCase = new RefreshTokenUseCase(mockUow as IAMUnitOfWork, jwtConfig);

      const rawRefreshToken = 'refresh-token-already-used';

      // Atomic rotate returns null because winner already consumed it
      mockUow.sessions.rotate.mockResolvedValue(null);
      mockUow.sessions.findAnyByTokenHash.mockResolvedValue(null);

      await expect(useCase.execute(rawRefreshToken)).rejects.toThrow(AuthenticationError);
      expect(mockUow.sessions.create).not.toHaveBeenCalled();
    });

    it('triggers reuse detection and revokes all user sessions when revoked token is reused', async () => {
      const useCase = new RefreshTokenUseCase(mockUow as IAMUnitOfWork, jwtConfig);

      const rawRefreshToken = 'compromised-reused-token';

      // Atomic rotate returns null because session is already revoked
      mockUow.sessions.rotate.mockResolvedValue(null);
      mockUow.sessions.findAnyByTokenHash.mockResolvedValue({
        id: 'compromised-session',
        user_id: 'victim-user-id',
        revoked_at: new Date(Date.now() - 60000),
      });

      await expect(useCase.execute(rawRefreshToken)).rejects.toThrow(AuthenticationError);

      // Verify all sessions of the victim user were immediately revoked
      expect(mockUow.sessions.revokeAllByUser).toHaveBeenCalledWith('victim-user-id');
    });

    it('A03 interleaving: when reuse detection revokes all user sessions during in-flight refresh, new session does not survive and request is rejected', async () => {
      const useCase = new RefreshTokenUseCase(mockUow as IAMUnitOfWork, jwtConfig);

      const rawRefreshToken = 'refresh-token-race-123';

      // 1. Request A atomically rotates session
      mockUow.sessions.rotate.mockResolvedValue({
        oldSession: {
          id: 'session-old',
          user_id: 'user-1',
          revoked_at: new Date(),
          expires_at: new Date(Date.now() + 86400000),
        },
        newSession: {
          id: 'session-new-race',
          user_id: 'user-1',
          revoked_at: null,
          expires_at: new Date(Date.now() + 86400000),
        },
      });

      // 2. Request A queries user; during this asynchronous window, Request B detects reuse and revokes all sessions
      mockUow.users.getById.mockImplementation(async () => {
        // Request B detected reuse and revoked all sessions of user-1!
        return {
          id: 'user-1',
          role: UserRole.USER,
          is_active: true,
        };
      });

      // 3. When Request A performs the post-check, session-new-race is now revoked
      mockUow.sessions.findById.mockResolvedValue({
        id: 'session-new-race',
        user_id: 'user-1',
        revoked_at: new Date(), // Revoked by concurrent reuse detection!
      });

      // Assert Request A throws TOKEN_INVALID and does not issue valid tokens
      await expect(useCase.execute(rawRefreshToken)).rejects.toThrow(AuthenticationError);
      await expect(useCase.execute(rawRefreshToken)).rejects.toMatchObject({
        code: ErrorCode.TOKEN_INVALID,
      });
    });
  });
});

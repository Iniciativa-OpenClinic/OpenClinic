import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPasswordUseCase } from '../../src/arch/application/use-cases/forgot-password.use-case.js';
import { ResetPasswordUseCase } from '../../src/arch/application/use-cases/reset-password.use-case.js';
import { AdminResetPasswordUseCase } from '../../src/arch/application/use-cases/admin-reset-password.use-case.js';
import type { IAMUnitOfWork } from '../../src/arch/domain/repositories.js';
import type { UserEntity } from '../../src/arch/domain/entities.js';
import {
  hashToken,
  verifyPassword,
  AuthenticationError,
  ValidationError,
  ErrorCode,
  SuccessCode,
  UserRole,
  SupportedLocales,
} from '@openclinic/core';

describe('Password Reset Security & Use Cases', () => {
  let mockUow: IAMUnitOfWork;

  const mockUser: UserEntity = {
    id: 'user-test-id',
    email: 'dra.ana@openclinic.local',
    username: 'dra.ana',
    hashed_password: 'initial-hashed-password',
    full_name: 'Dra. Ana Neri',
    display_name: 'Dra. Ana',
    role: UserRole.USER,
    is_active: true,
    is_tenant_owner: false,
    tenant_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    access_count: 3,
    last_access: new Date(),
    require_password_change: false,
    password_reset_token: null,
    password_reset_expires_at: null,
    timezone: 'America/Sao_Paulo',
    locale: SupportedLocales.PT_BR,
  };

  beforeEach(() => {
    mockUow = {
      users: {
        getById: vi.fn().mockImplementation(async (id: string) => {
          if (id === mockUser.id) return { ...mockUser };
          return null;
        }),
        getByIdentifier: vi.fn().mockImplementation(async (identifier: string) => {
          if (identifier === mockUser.username || identifier === mockUser.email) {
            return { ...mockUser };
          }
          return null;
        }),
        getByField: vi.fn(),
        getByEmail: vi.fn(),
        listByField: vi.fn(),
        listAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockImplementation(async (_id: string, data: Partial<UserEntity>) => ({
          ...mockUser,
          ...data,
        })),
        delete: vi.fn(),
      },
      tenants: {} as any,
      groups: {} as any,
      sessions: {
        revokeAllByUser: vi.fn().mockResolvedValue(undefined),
        revoke: vi.fn().mockResolvedValue(undefined),
        findByTokenHash: vi.fn().mockResolvedValue(null),
      } as any,
      lockouts: {} as any,
      auditLogs: {
        create: vi.fn().mockResolvedValue({ id: 'audit-id' }),
        listByField: vi.fn(),
        listAll: vi.fn(),
      } as any,
      resources: {} as any,
      permissions: {} as any,
      applications: {} as any,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('ForgotPasswordUseCase (SEC-01 Mitigation)', () => {
    it('should return generic success when user is not found to prevent user enumeration', async () => {
      const useCase = new ForgotPasswordUseCase(mockUow);
      const result = await useCase.execute('unknown.user@domain.com');

      expect(result.code).toBe(SuccessCode.FORGOT_PASSWORD_SENT);
      expect(result.data?.expires_in_minutes).toBe(30);
      expect((result.data as any)?.reset_token).toBeUndefined();
      expect((result.data as any)?.simulated_email).toBeUndefined();
      expect(mockUow.users.update).not.toHaveBeenCalled();
      expect(mockUow.auditLogs.create).not.toHaveBeenCalled();
    });

    it('should store a 64-char SHA-256 hash in the database and NOT return the raw reset token in the public response', async () => {
      const useCase = new ForgotPasswordUseCase(mockUow);
      const result = await useCase.execute('dra.ana');

      expect(result.code).toBe(SuccessCode.FORGOT_PASSWORD_SENT);
      expect(result.data?.expires_in_minutes).toBe(30);
      // Security Invariant (R01): Public response MUST NOT leak reset_token or simulated_email
      expect((result.data as any)?.reset_token).toBeUndefined();
      expect((result.data as any)?.simulated_email).toBeUndefined();

      // Verify that the database was updated with the SHA-256 hash
      expect(mockUow.users.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          password_reset_token: expect.stringMatching(/^[0-9a-f]{64}$/),
          password_reset_expires_at: expect.any(Date),
        }),
      );

      // Audit log must have been created
      expect(mockUow.auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          action: 'forgot_password_requested',
          resource: 'auth',
        }),
      );
    });
  });

  describe('ResetPasswordUseCase (SEC-01 Verification)', () => {
    it('should reject passwords shorter than 8 characters', async () => {
      const useCase = new ResetPasswordUseCase(mockUow);

      await expect(useCase.execute('any-token', 'short')).rejects.toThrow(ValidationError);
      await expect(useCase.execute('any-token', 'short')).rejects.toMatchObject({
        code: ErrorCode.PASSWORD_TOO_SHORT,
      });
    });

    it('should query the database using the SHA-256 hash of the incoming token', async () => {
      const rawToken = '7b70743b-ca9d-47fb-9403-d2d480da4563';
      const tokenHash = hashToken(rawToken);

      const userWithResetToken: UserEntity = {
        ...mockUser,
        password_reset_token: tokenHash,
        password_reset_expires_at: new Date(Date.now() + 15 * 60000), // 15 mins left
      };

      vi.mocked(mockUow.users.getByField).mockImplementation(async (field: string, val: unknown) => {
        if (field === 'password_reset_token' && val === tokenHash) {
          return userWithResetToken;
        }
        return null;
      });

      const useCase = new ResetPasswordUseCase(mockUow);
      const result = await useCase.execute(rawToken, 'newStrongP@ssw0rd2026');

      expect(result.code).toBe(SuccessCode.PASSWORD_RESET_SUCCESS);
      expect(result.data?.id).toBe(mockUser.id);

      // Ensure getByField was invoked with the hashed token, NOT raw token
      expect(mockUow.users.getByField).toHaveBeenCalledWith('password_reset_token', tokenHash);
      expect(mockUow.users.getByField).not.toHaveBeenCalledWith('password_reset_token', rawToken);

      // Verify that the user password was updated with a valid Argon2 hash and token cleared
      expect(mockUow.users.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          password_reset_token: null,
          password_reset_expires_at: null,
          require_password_change: false,
        }),
      );

      const updateCall = vi.mocked(mockUow.users.update).mock.calls[0];
      const updatedHashedPassword = updateCall[1].hashed_password as string;
      const isValid = await verifyPassword(updatedHashedPassword, 'newStrongP@ssw0rd2026');
      expect(isValid).toBe(true);

      // Verify active sessions were invalidated upon password reset
      expect(mockUow.sessions.revokeAllByUser).toHaveBeenCalledWith(mockUser.id);

      // Audit log created
      expect(mockUow.auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          action: 'reset_password_success',
          resource: 'auth',
        }),
      );
    });

    it('should throw AuthenticationError if token does not match any user', async () => {
      vi.mocked(mockUow.users.getByField).mockResolvedValue(null);

      const useCase = new ResetPasswordUseCase(mockUow);
      await expect(useCase.execute('invalid-token', 'newStrongP@ssw0rd2026')).rejects.toThrow(AuthenticationError);
      await expect(useCase.execute('invalid-token', 'newStrongP@ssw0rd2026')).rejects.toMatchObject({
        code: ErrorCode.TOKEN_INVALID,
      });
    });

    it('should throw AuthenticationError if token has expired', async () => {
      const rawToken = 'expired-token-uuid';
      const tokenHash = hashToken(rawToken);

      const userWithExpiredToken: UserEntity = {
        ...mockUser,
        password_reset_token: tokenHash,
        password_reset_expires_at: new Date(Date.now() - 5 * 60000), // Expired 5 mins ago
      };

      vi.mocked(mockUow.users.getByField).mockResolvedValue(userWithExpiredToken);

      const useCase = new ResetPasswordUseCase(mockUow);
      await expect(useCase.execute(rawToken, 'newStrongP@ssw0rd2026')).rejects.toThrow(AuthenticationError);
      await expect(useCase.execute(rawToken, 'newStrongP@ssw0rd2026')).rejects.toMatchObject({
        code: ErrorCode.TOKEN_INVALID,
      });
    });
  });

  describe('AdminResetPasswordUseCase Integration', () => {
    it('should clear password_reset_token and password_reset_expires_at upon administrative reset', async () => {
      const useCase = new AdminResetPasswordUseCase(mockUow);
      const result = await useCase.execute(UserRole.OWNER, mockUser.id, 'adminForcedPass123!');

      expect(result.code).toBe(SuccessCode.PASSWORD_RESET_SUCCESS);
      expect(mockUow.users.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          password_reset_token: null,
          password_reset_expires_at: null,
          require_password_change: false,
        }),
      );
    });
  });
});

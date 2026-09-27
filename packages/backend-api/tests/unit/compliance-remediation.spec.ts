import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole, ResourceAction, PermissionEffect, AccessDeniedError, ErrorCode, SuccessCode } from '@openclinic/core';
import { IAMPermissionService } from '../../src/arch/application/services/iam-permission.service.js';
import { UpdateUserAdminUseCase } from '../../src/arch/application/use-cases/update-user-admin.use-case.js';
import { DeleteUserAdminUseCase } from '../../src/arch/application/use-cases/delete-user-admin.use-case.js';
import { LogoutUseCase } from '../../src/arch/application/use-cases/logout.use-case.js';
import { ForgotPasswordUseCase } from '../../src/arch/application/use-cases/forgot-password.use-case.js';
import { errorHandler } from '../../src/arch/presentation/error-handler.js';
import type { IAMUnitOfWork } from '../../src/arch/domain/repositories.js';

vi.mock('../../src/config/env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:1/unused',
    JWT_KEY: 'synthetic-test-key-with-at-least-32-characters',
    JWT_ALGORITHM: 'HS256',
    ACCESS_TOKEN_EXPIRE_MINUTES: 15,
    REFRESH_TOKEN_EXPIRE_DAYS: 7,
    CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
  },
}));

describe('Compliance Remediation Tests (2026-09-13 Codex Audit)', () => {
  let mockUow: any;

  beforeEach(() => {
    mockUow = {
      users: {
        getById: vi.fn(),
        getByIdentifier: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue(true),
      },
      sessions: {
        create: vi.fn(),
        findById: vi.fn(),
        findByTokenHash: vi.fn(),
        findAnyByTokenHash: vi.fn(),
        revokeIfActive: vi.fn(),
        revoke: vi.fn().mockResolvedValue(undefined),
        revokeAllByUser: vi.fn().mockResolvedValue(undefined),
        deleteExpired: vi.fn(),
      },
      lockouts: {
        reset: vi.fn().mockResolvedValue(undefined),
      },
      auditLogs: {
        create: vi.fn().mockResolvedValue({ id: 'audit-id' }),
      },
      groups: {
        getUserGroups: vi.fn().mockResolvedValue([]),
      },
      resources: {
        listAll: vi.fn().mockResolvedValue([]),
        getByItemCode: vi.fn(),
      },
      permissions: {
        getAclMap: vi.fn().mockResolvedValue([]),
        listByUserId: vi.fn().mockResolvedValue([]),
      },
      tenants: {
        getDefaultTenant: vi.fn().mockResolvedValue({ id: 'tenant-default' }),
      },
    };
  });

  describe('R01: Forgot Password Response Privacy', () => {
    it('does not return reset_token or simulated_email in public response', async () => {
      mockUow.users.getByIdentifier.mockResolvedValue({
        id: 'user-id-1',
        email: 'doctor@clinic.local',
        username: 'doctor',
      });

      const useCase = new ForgotPasswordUseCase(mockUow);
      const result = await useCase.execute('doctor@clinic.local');

      expect(result.code).toBe(SuccessCode.FORGOT_PASSWORD_SENT);
      expect((result.data as any)?.reset_token).toBeUndefined();
      expect((result.data as any)?.simulated_email).toBeUndefined();
      expect(result.data?.expires_in_minutes).toBe(30);
    });
  });

  describe('R02: Logout Session Ownership', () => {
    it('does not revoke session if session belongs to another user', async () => {
      mockUow.sessions.findByTokenHash.mockResolvedValue({
        id: 'session-other',
        user_id: 'other-user-id', // Differs from calling user
      });

      const useCase = new LogoutUseCase(mockUow);
      await useCase.execute('my-user-id', 'refresh-token-value');

      expect(mockUow.sessions.revoke).not.toHaveBeenCalled();
    });

    it('revokes session when session belongs to calling user', async () => {
      mockUow.sessions.findByTokenHash.mockResolvedValue({
        id: 'session-mine',
        user_id: 'my-user-id',
      });

      const useCase = new LogoutUseCase(mockUow);
      await useCase.execute('my-user-id', 'refresh-token-value');

      expect(mockUow.sessions.revoke).toHaveBeenCalledWith('session-mine');
    });
  });

  describe('R04: Multi-Tenant Boundary Isolation for Users', () => {
    it('blocks ADMIN from editing a user belonging to another tenant', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'target-user-id',
        role: UserRole.USER,
        tenant_id: 'tenant-b',
      });

      const useCase = new UpdateUserAdminUseCase(mockUow);
      await expect(
        useCase.execute(
          UserRole.ADMIN,
          'target-user-id',
          {
            email: 'user@tenantb.com',
            username: 'userb',
            full_name: 'User B',
            role: UserRole.USER,
          },
          '127.0.0.1',
          'tenant-a' // Requester is in tenant-a
        )
      ).rejects.toThrow(AccessDeniedError);
    });

    it('blocks ADMIN from deleting a user belonging to another tenant', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'target-user-id',
        role: UserRole.USER,
        tenant_id: 'tenant-b',
      });

      const useCase = new DeleteUserAdminUseCase(mockUow);
      await expect(
        useCase.execute(
          UserRole.ADMIN,
          'admin-user-id',
          'target-user-id',
          '127.0.0.1',
          'tenant-a' // Requester is in tenant-a
        )
      ).rejects.toThrow(AccessDeniedError);
    });

    it('allows OWNER to manage users regardless of tenant', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'target-user-id',
        role: UserRole.USER,
        tenant_id: 'tenant-b',
        email: 'user@tenantb.com',
        username: 'userb',
        full_name: 'User B',
      });

      const useCase = new DeleteUserAdminUseCase(mockUow);
      const result = await useCase.execute(
        UserRole.OWNER,
        'owner-user-id',
        'target-user-id',
        '127.0.0.1',
        'tenant-a'
      );

      expect(result.code).toBe(SuccessCode.USER_DELETED);
    });
  });

  describe('R05: IAM ACL Resolution with DENY Precedence and Inactive Groups', () => {
    it('excludes inactive groups from ACL resolution', async () => {
      mockUow.users.getById.mockResolvedValue({ id: 'u1', role: UserRole.USER });
      mockUow.groups.getUserGroups.mockResolvedValue([
        { id: 'grp-inactive', is_active: false },
        { id: 'grp-active', is_active: true },
      ]);
      mockUow.resources.listAll.mockResolvedValue([
        { id: 'r1', item_code: 'pep', min_role: 'USER', is_active: true },
      ]);
      mockUow.permissions.getAclMap.mockResolvedValue([]);

      const service = new IAMPermissionService(mockUow);
      await service.getUserCapabilities('u1');

      // Ensure getAclMap was called with only active group IDs
      expect(mockUow.permissions.getAclMap).toHaveBeenCalledWith('u1', ['grp-active']);
    });

    it('enforces that DENY overrides broad MANAGE/ALL actions', async () => {
      mockUow.users.getById.mockResolvedValue({ id: 'u1', role: UserRole.USER });
      mockUow.groups.getUserGroups.mockResolvedValue([{ id: 'g1', is_active: true }]);
      mockUow.resources.listAll.mockResolvedValue([
        { id: 'r1', item_code: 'records', min_role: 'USER', is_active: true },
      ]);
      // g1 has MANAGE, but user has explicit DENY for DELETE
      mockUow.permissions.getAclMap.mockResolvedValue([
        { resource_id: 'r1', action: ResourceAction.MANAGE, effect: PermissionEffect.ALLOW },
        { resource_id: 'r1', action: ResourceAction.DELETE, effect: PermissionEffect.DENY },
      ]);

      const service = new IAMPermissionService(mockUow);
      const canRead = await service.hasPermission('u1', 'records', ResourceAction.READ);
      const canDelete = await service.hasPermission('u1', 'records', ResourceAction.DELETE);

      expect(canRead).toBe(true);
      expect(canDelete).toBe(false);
    });
  });

  describe('R07: Standard RFC 7807 Error Responses for Fastify Errors', () => {
    it('formats JSON parse / syntax errors as HTTP 400 problem details', () => {
      const syntaxError = new SyntaxError('Unexpected token in JSON at position 5');
      const req: any = { url: '/api/v1/auth/login', headers: {} };
      let sentStatus = 0;
      let sentBody: any = null;
      const reply: any = {
        status: (code: number) => {
          sentStatus = code;
          return reply;
        },
        send: (body: any) => {
          sentBody = body;
        },
      };

      errorHandler(syntaxError as any, req, reply);

      expect(sentStatus).toBe(400);
      expect(sentBody.status).toBe(400);
      expect(sentBody.title).toBe('SyntaxError');
      expect(sentBody.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(sentBody.detail).toBe('Malformed JSON request payload');
    });
  });

  describe('R10: CORS Allowlist and Health Probes', () => {
    it('allows trusted origins and sets credentials header', async () => {
      const { buildApp } = await import('../../src/app.js');
      const app = await buildApp({
        uow: mockUow,
        corsAllowedOrigins: ['http://localhost:5173'],
        enableSwaggerUi: false,
      });

      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health/live',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'GET',
        },
      });

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      await app.close();
    }, 15000);

    it('rejects untrusted origins by omitting allow-origin header', async () => {
      const { buildApp } = await import('../../src/app.js');
      const app = await buildApp({
        uow: mockUow,
        corsAllowedOrigins: ['http://localhost:5173'],
        enableSwaggerUi: false,
      });

      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health/live',
        headers: {
          origin: 'http://untrusted-attacker.com',
          'access-control-request-method': 'GET',
        },
      });

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      await app.close();
    });

    it('returns 200 for liveness probe /health/live', async () => {
      const { buildApp } = await import('../../src/app.js');
      const app = await buildApp({
        uow: mockUow,
        enableSwaggerUi: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.status).toBe('ok');
      expect(json.timestamp).toBeDefined();
      await app.close();
    });
  });
});

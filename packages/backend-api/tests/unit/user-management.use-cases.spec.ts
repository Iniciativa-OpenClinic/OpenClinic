import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListUsersUseCase } from '../../src/arch/application/use-cases/list-users.use-case.js';
import { UnlockUserUseCase } from '../../src/arch/application/use-cases/unlock-user.use-case.js';
import { ToggleUserStatusUseCase } from '../../src/arch/application/use-cases/toggle-user-status.use-case.js';
import { AdminResetPasswordUseCase } from '../../src/arch/application/use-cases/admin-reset-password.use-case.js';
import { CreateUserAdminUseCase } from '../../src/arch/application/use-cases/create-user-admin.use-case.js';
import { UpdateUserAdminUseCase } from '../../src/arch/application/use-cases/update-user-admin.use-case.js';
import { DeleteUserAdminUseCase } from '../../src/arch/application/use-cases/delete-user-admin.use-case.js';
import type { IAMUnitOfWork } from '../../src/arch/domain/repositories.js';
import type { UserEntity, LockoutEntity } from '../../src/arch/domain/entities.js';
import { AccessDeniedError, EntityNotFoundError, ValidationError, EntityAlreadyExistsError, SuccessCode, UserRole, SupportedLocales, BOOTSTRAP_DEFAULTS } from '@openclinic/core';

describe('User Management Use Cases', () => {
  let mockUow: IAMUnitOfWork;

  const mockUser1: UserEntity = {
    id: 'user-1-id',
    email: 'carlos@openclinic.local',
    username: 'dr.carlos',
    hashed_password: 'hashed-password-1',
    full_name: 'Dr. Carlos Silva',
    display_name: 'Dr. Carlos Silva',
    role: UserRole.USER,
    is_active: true,
    is_tenant_owner: false,
    tenant_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    access_count: 5,
    last_access: new Date(),
    require_password_change: false,
    password_reset_token: null,
    password_reset_expires_at: null,
    timezone: 'America/Sao_Paulo',
    locale: SupportedLocales.PT_BR,
  };

  const mockOwnerUser: UserEntity = {
    id: 'user-owner-id',
    email: 'owner@openclinic.local',
    username: 'owner.master',
    hashed_password: 'hashed-password-owner',
    full_name: 'Super Owner Master',
    display_name: 'Owner',
    role: UserRole.OWNER,
    is_active: true,
    is_tenant_owner: true,
    tenant_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    access_count: 10,
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
          if (id === mockUser1.id) return mockUser1;
          if (id === mockOwnerUser.id) return mockOwnerUser;
          return null;
        }),
        listAll: vi.fn().mockImplementation(async () => {
          return [mockUser1, mockOwnerUser];
        }),
        getByIdentifier: vi.fn(),
        getByEmail: vi.fn().mockResolvedValue(null),
        getByField: vi.fn().mockResolvedValue(null),
        listByField: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(async (data: Partial<UserEntity>) => ({
          id: 'new-user-id',
          created_at: new Date(),
          updated_at: new Date(),
          access_count: 0,
          last_access: null,
          require_password_change: false,
          password_reset_token: null,
          password_reset_expires_at: null,
          timezone: null,
          locale: null,
          ...data,
        })),
        update: vi.fn().mockImplementation(async (id: string, data: Partial<UserEntity>) => ({
          ...mockUser1,
          ...data,
        })),
        delete: vi.fn().mockResolvedValue(true),
      },
      tenants: {
        getDefaultTenant: vi.fn().mockResolvedValue({ id: 'tenant-default-id', name: 'OpenClinic', slug: 'openclinic', is_default: true, is_active: true, created_at: new Date(), updated_at: new Date(), deleted_at: null }),
        getBySlug: vi.fn().mockResolvedValue(null),
        getById: vi.fn().mockResolvedValue({ id: 'tenant-default-id', name: 'OpenClinic', slug: 'openclinic', is_default: true, is_active: true, created_at: new Date(), updated_at: new Date(), deleted_at: null }),
        listAll: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getByField: vi.fn(),
        listByField: vi.fn(),
      },
      groups: {
        getById: vi.fn(),
        getDefaultGroup: vi.fn().mockResolvedValue({ id: 'grp-default-id', name: BOOTSTRAP_DEFAULTS.DEFAULT_GROUP_NAME, is_default: true, is_active: true }),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getByField: vi.fn(),
        listByField: vi.fn(),
        listAll: vi.fn(),
        findByName: vi.fn(),
        findAllWithMemberCount: vi.fn(),
        getMembers: vi.fn(),
        getUserGroups: vi.fn(),
        addMember: vi.fn().mockResolvedValue(undefined),
        removeMember: vi.fn(),
        isMember: vi.fn(),
      },
      sessions: {
        create: vi.fn(),
        findById: vi.fn(),
        findByTokenHash: vi.fn(),
        findAnyByTokenHash: vi.fn(),
        revokeIfActive: vi.fn(),
        revoke: vi.fn(),
        revokeAllByUser: vi.fn(),
        deleteExpired: vi.fn(),
      },
      lockouts: {
        getByIdentifier: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
        reset: vi.fn().mockResolvedValue(undefined),
      },
      auditLogs: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      resources: {} as any,
      permissions: {} as any,
      applications: {} as any,
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('ListUsersUseCase', () => {
    it('should list all users with is_locked = false when there are no active lockouts for an OWNER requester', async () => {
      const useCase = new ListUsersUseCase(mockUow);
      const result = await useCase.execute(0, 100, UserRole.OWNER);

      expect(mockUow.users.listAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockUser1.id);
      expect(result[0].is_locked).toBe(false);
      expect(result[1].id).toBe(mockOwnerUser.id);
      expect(result[1].is_locked).toBe(false);
    });

    it('should mark is_locked = true when user has an active lockout', async () => {
      vi.mocked(mockUow.lockouts.getByIdentifier).mockImplementation(async (identifier: string) => {
        if (identifier === mockUser1.email) {
          const activeLockout: LockoutEntity = {
            id: 'lock-1',
            identifier: mockUser1.email,
            attempt_count: 5,
            locked_until: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes in future
            tenant_id: null,
            created_at: new Date(),
            updated_at: new Date(),
          };
          return activeLockout;
        }
        return null;
      });

      const useCase = new ListUsersUseCase(mockUow);
      const result = await useCase.execute(0, 100, UserRole.OWNER);

      expect(result[0].is_locked).toBe(true);
      expect(result[1].is_locked).toBe(false);
    });

    it('should mark is_locked = false when lockout expiration is in the past', async () => {
      vi.mocked(mockUow.lockouts.getByIdentifier).mockImplementation(async (identifier: string) => {
        if (identifier === mockUser1.email) {
          const pastLockout: LockoutEntity = {
            id: 'lock-1',
            identifier: mockUser1.email,
            attempt_count: 5,
            locked_until: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes in past
            tenant_id: null,
            created_at: new Date(),
            updated_at: new Date(),
          };
          return pastLockout;
        }
        return null;
      });

      const useCase = new ListUsersUseCase(mockUow);
      const result = await useCase.execute(0, 100, UserRole.OWNER);

      expect(result[0].is_locked).toBe(false);
    });

    it.each([
      [UserRole.ADMIN],
      [UserRole.USER],
      [undefined],
    ])('should filter out OWNER users when requester is not OWNER (%s)', async (requesterRole) => {
      const useCase = new ListUsersUseCase(mockUow);
      const result = await useCase.execute(0, 100, requesterRole);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockUser1.id);
      expect(result.some((u) => u.role === UserRole.OWNER)).toBe(false);
    });

    it('should include OWNER users only when requester is explicitly OWNER', async () => {
      const useCase = new ListUsersUseCase(mockUow);
      const result = await useCase.execute(0, 100, UserRole.OWNER);

      expect(result).toHaveLength(2);
      expect(result.some((u) => u.role === UserRole.OWNER)).toBe(true);
    });
  });

  describe('UnlockUserUseCase', () => {
    it('should unlock a locked user by resetting email and username lockouts and logging audit event', async () => {
      const useCase = new UnlockUserUseCase(mockUow);
      const result = await useCase.execute('ADMIN', mockUser1.id, '127.0.0.1');

      expect(mockUow.lockouts.reset).toHaveBeenCalledWith(mockUser1.email);
      expect(mockUow.lockouts.reset).toHaveBeenCalledWith(mockUser1.username);
      expect(mockUow.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUser1.id,
        action: 'user_unlocked_by_admin',
        status: 'SUCCESS',
      }));
      expect(result.code).toBe(SuccessCode.USER_UNLOCKED);
      expect(result.message).toContain('desativado com sucesso');
    });

    it.each([UserRole.ADMIN, UserRole.USER])('should throw AccessDeniedError when non-OWNER (%s) tries to unlock an OWNER', async (role) => {
      const useCase = new UnlockUserUseCase(mockUow);
      await expect(useCase.execute(role, mockOwnerUser.id)).rejects.toThrow(AccessDeniedError);
    });

    it('should allow OWNER to unlock an OWNER', async () => {
      const useCase = new UnlockUserUseCase(mockUow);
      const result = await useCase.execute(UserRole.OWNER, mockOwnerUser.id);
      expect(result.code).toBe(SuccessCode.USER_UNLOCKED);
      expect(result.message).toContain('desativado com sucesso');
    });

    it('should throw EntityNotFoundError when user does not exist', async () => {
      const useCase = new UnlockUserUseCase(mockUow);
      await expect(useCase.execute(UserRole.ADMIN, 'non-existing-id')).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('ToggleUserStatusUseCase', () => {
    it('should toggle user active status and audit', async () => {
      const useCase = new ToggleUserStatusUseCase(mockUow);
      const result = await useCase.execute(UserRole.ADMIN, mockUser1.id, '127.0.0.1');

      expect(mockUow.users.update).toHaveBeenCalledWith(mockUser1.id, { is_active: false });
      expect(result.code).toBe(SuccessCode.USER_STATUS_TOGGLED);
      expect(result.data?.is_active).toBe(false);
      expect(mockUow.auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'user_deactivated',
      }));
    });

    it('should throw AccessDeniedError when user attempts to toggle status of their own account', async () => {
      const useCase = new ToggleUserStatusUseCase(mockUow);
      await expect(useCase.execute(UserRole.ADMIN, mockUser1.id, '127.0.0.1', mockUser1.id)).rejects.toThrow(AccessDeniedError);
    });

    it.each([UserRole.ADMIN, UserRole.USER])('should throw AccessDeniedError when non-OWNER (%s) attempts to toggle status of OWNER', async (role) => {
      const useCase = new ToggleUserStatusUseCase(mockUow);
      await expect(useCase.execute(role, mockOwnerUser.id)).rejects.toThrow(AccessDeniedError);
    });
  });

  describe('AdminResetPasswordUseCase', () => {
    it('should reset user password when given a valid >=8 characters password', async () => {
      const useCase = new AdminResetPasswordUseCase(mockUow);
      const result = await useCase.execute(UserRole.ADMIN, mockUser1.id, 'newStrongPass123');

      expect(mockUow.users.update).toHaveBeenCalledWith(
        mockUser1.id,
        expect.objectContaining({
          require_password_change: false,
        })
      );
      expect(result.code).toBe(SuccessCode.PASSWORD_RESET_SUCCESS);
      expect(result.message).toContain('redefinida com sucesso');
    });

    it('should throw ValidationError if password has fewer than 8 characters', async () => {
      const useCase = new AdminResetPasswordUseCase(mockUow);
      await expect(useCase.execute(UserRole.ADMIN, mockUser1.id, 'short')).rejects.toThrow(ValidationError);
    });

    it.each([UserRole.ADMIN, UserRole.USER])('should throw AccessDeniedError if non-OWNER (%s) tries to reset OWNER password', async (role) => {
      const useCase = new AdminResetPasswordUseCase(mockUow);
      await expect(useCase.execute(role, mockOwnerUser.id, 'newStrongPass123')).rejects.toThrow(AccessDeniedError);
    });
  });

  describe('CreateUserAdminUseCase', () => {
    it('should allow ADMIN to create a USER', async () => {
      const useCase = new CreateUserAdminUseCase(mockUow);
      const result = await useCase.execute(UserRole.ADMIN, {
        email: 'novo@openclinic.local',
        username: 'novo.user',
        full_name: 'Novo Usuário',
        password: 'password123',
        role: 'USER',
      });

      expect(result.code).toBe(SuccessCode.USER_CREATED);
      expect(result.data).toMatchObject({
        email: 'novo@openclinic.local',
        username: 'novo.user',
        full_name: 'Novo Usuário',
        role: 'USER',
        is_active: true,
      });
      expect(mockUow.users.create).toHaveBeenCalledWith(expect.objectContaining({
        tenant_id: 'tenant-default-id',
      }));
      expect(mockUow.groups.addMember).toHaveBeenCalledWith('grp-default-id', 'new-user-id');
    });

    it.each([UserRole.ADMIN, UserRole.USER])('should prevent non-OWNER (%s) from creating an OWNER', async (role) => {
      const useCase = new CreateUserAdminUseCase(mockUow);
      await expect(useCase.execute(role, {
        email: 'novo.owner@openclinic.local',
        username: 'novo.owner',
        full_name: 'Novo Owner',
        password: 'password123',
        role: 'OWNER',
      })).rejects.toThrow(AccessDeniedError);
    });

    it('should throw EntityAlreadyExistsError if email already exists', async () => {
      vi.mocked(mockUow.users.getByEmail).mockResolvedValueOnce(mockUser1);
      const useCase = new CreateUserAdminUseCase(mockUow);
      await expect(useCase.execute(UserRole.ADMIN, {
        email: mockUser1.email,
        username: 'another.user',
        full_name: 'Novo Usuário',
        password: 'password123',
        role: 'USER',
      })).rejects.toThrow(EntityAlreadyExistsError);
    });
  });

  describe('UpdateUserAdminUseCase', () => {
    it('should allow ADMIN to update a USER', async () => {
      const useCase = new UpdateUserAdminUseCase(mockUow);
      const result = await useCase.execute(UserRole.ADMIN, mockUser1.id, {
        email: 'carlos.editado@openclinic.local',
        username: 'carlos.editado',
        full_name: 'Dr. Carlos Silva Editado',
        role: 'USER',
      });

      expect(mockUow.users.update).toHaveBeenCalledWith(
        mockUser1.id,
        expect.objectContaining({
          email: 'carlos.editado@openclinic.local',
          username: 'carlos.editado',
          full_name: 'Dr. Carlos Silva Editado',
        })
      );
      expect(result.code).toBe(SuccessCode.USER_UPDATED);
      expect(result.data).toMatchObject({
        id: mockUser1.id,
        role: 'USER',
      });
    });

    it.each([UserRole.ADMIN, UserRole.USER])('should prevent non-OWNER (%s) from editing an OWNER user', async (role) => {
      const useCase = new UpdateUserAdminUseCase(mockUow);
      await expect(useCase.execute(role, mockOwnerUser.id, {
        email: 'owner.edit@openclinic.local',
        username: 'owner.edit',
        full_name: 'Super Owner Edit',
        role: 'USER',
      })).rejects.toThrow(AccessDeniedError);
    });

    it.each([UserRole.ADMIN, UserRole.USER])('should prevent non-OWNER (%s) from promoting a user to OWNER role', async (role) => {
      const useCase = new UpdateUserAdminUseCase(mockUow);
      await expect(useCase.execute(role, mockUser1.id, {
        email: 'carlos@openclinic.local',
        username: 'dr.carlos',
        full_name: 'Dr. Carlos Silva',
        role: 'OWNER',
      })).rejects.toThrow(AccessDeniedError);
    });

    it('should throw EntityNotFoundError if user to edit does not exist', async () => {
      const useCase = new UpdateUserAdminUseCase(mockUow);
      await expect(useCase.execute(UserRole.ADMIN, 'non-existent-id', {
        email: 'test@test.com',
        username: 'test',
        full_name: 'Test',
        role: 'USER',
      })).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('DeleteUserAdminUseCase', () => {
    it('should allow ADMIN to delete a USER', async () => {
      const useCase = new DeleteUserAdminUseCase(mockUow);
      const result = await useCase.execute(UserRole.ADMIN, 'admin-id', mockUser1.id);

      expect(mockUow.sessions.revokeAllByUser).toHaveBeenCalledWith(mockUser1.id);
      expect(mockUow.users.delete).toHaveBeenCalledWith(mockUser1.id);
      expect(result.code).toBe(SuccessCode.USER_DELETED);
      expect(result.message).toContain('excluído com sucesso');
    });

    it('should prevent user from deleting their own account', async () => {
      const useCase = new DeleteUserAdminUseCase(mockUow);
      await expect(useCase.execute(UserRole.ADMIN, mockUser1.id, mockUser1.id)).rejects.toThrow(AccessDeniedError);
    });

    it.each([UserRole.ADMIN, UserRole.USER])('should prevent non-OWNER (%s) from deleting an OWNER user', async (role) => {
      const useCase = new DeleteUserAdminUseCase(mockUow);
      await expect(useCase.execute(role, 'admin-id', mockOwnerUser.id)).rejects.toThrow(AccessDeniedError);
    });
  });
});

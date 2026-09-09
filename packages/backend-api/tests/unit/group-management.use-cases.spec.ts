import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListGroupsUseCase } from '../../src/arch/application/use-cases/list-groups.use-case.js';
import { CreateGroupUseCase } from '../../src/arch/application/use-cases/create-group.use-case.js';
import { UpdateGroupUseCase } from '../../src/arch/application/use-cases/update-group.use-case.js';
import { DeleteGroupUseCase } from '../../src/arch/application/use-cases/delete-group.use-case.js';
import { GetGroupMembersUseCase } from '../../src/arch/application/use-cases/get-group-members.use-case.js';
import { AddGroupMemberUseCase } from '../../src/arch/application/use-cases/add-group-member.use-case.js';
import { RemoveGroupMemberUseCase } from '../../src/arch/application/use-cases/remove-group-member.use-case.js';
import { GetUserGroupsUseCase } from '../../src/arch/application/use-cases/get-user-groups.use-case.js';
import { AddUserToGroupUseCase } from '../../src/arch/application/use-cases/add-user-to-group.use-case.js';
import { RemoveUserFromGroupUseCase } from '../../src/arch/application/use-cases/remove-user-from-group.use-case.js';
import type { IAMUnitOfWork } from '../../src/arch/domain/repositories.js';
import type { GroupEntity, UserEntity } from '../../src/arch/domain/entities.js';
import { EntityNotFoundError, EntityAlreadyExistsError, AccessDeniedError, ValidationError, SuccessCode, SupportedLocales, UserRole } from '@openclinic/core';

describe('Group Management Use Cases', () => {
  let mockUow: IAMUnitOfWork;

  const mockGroup1: GroupEntity = {
    id: 'grp-1-id',
    name: 'Corpo Clínico',
    description: 'Médicos e especialistas',
    is_active: true,
    is_default: false,
    tenant_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const mockGroup2: GroupEntity = {
    id: 'grp-2-id',
    name: 'Recepção',
    description: 'Atendimento ao paciente',
    is_active: true,
    is_default: false,
    tenant_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const mockDefaultGroup: GroupEntity = {
    id: 'grp-default-id',
    name: 'Todos os Usuários',
    description: 'Grupo padrão do sistema',
    is_active: true,
    is_default: true,
    tenant_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const mockUser1: UserEntity = {
    id: 'usr-1-id',
    email: 'carlos@openclinic.local',
    username: 'dr.carlos',
    hashed_password: 'hashed-password',
    full_name: 'Dr. Carlos Silva',
    display_name: 'Dr. Carlos',
    role: UserRole.USER,
    is_active: true,
    is_tenant_owner: false,
    tenant_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    access_count: 0,
    last_access: null,
    require_password_change: false,
    password_reset_token: null,
    password_reset_expires_at: null,
    timezone: 'America/Sao_Paulo',
    locale: SupportedLocales.PT_BR,
  };

  beforeEach(() => {
    mockUow = {
      users: {
        getById: vi.fn().mockImplementation((id: string) => Promise.resolve(id === mockUser1.id ? mockUser1 : null)),
        getByIdentifier: vi.fn(),
        getByEmail: vi.fn().mockResolvedValue(null),
        getByField: vi.fn().mockResolvedValue(null),
        listByField: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        listAll: vi.fn().mockResolvedValue([mockUser1]),
      },
      tenants: {
        getDefaultTenant: vi.fn().mockResolvedValue({ id: 'default-tenant-id', name: 'OpenClinic', slug: 'openclinic', is_default: true, is_active: true, created_at: new Date(), updated_at: new Date(), deleted_at: null }),
        getBySlug: vi.fn().mockResolvedValue(null),
        getById: vi.fn().mockResolvedValue({ id: 'default-tenant-id', name: 'OpenClinic', slug: 'openclinic', is_default: true, is_active: true, created_at: new Date(), updated_at: new Date(), deleted_at: null }),
        listAll: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getByField: vi.fn(),
        listByField: vi.fn(),
      },
      groups: {
        create: vi.fn(),
        getById: vi.fn().mockImplementation((id: string) => Promise.resolve(id === mockGroup1.id ? mockGroup1 : id === mockGroup2.id ? mockGroup2 : id === mockDefaultGroup.id ? mockDefaultGroup : null)),
        getDefaultGroup: vi.fn().mockResolvedValue(mockDefaultGroup),
        findByName: vi.fn().mockImplementation((name: string) => Promise.resolve(name === mockGroup1.name ? mockGroup1 : null)),
        findAllWithMemberCount: vi.fn().mockResolvedValue([{ ...mockGroup1, member_count: 2 }, { ...mockGroup2, member_count: 0 }]),
        getMembers: vi.fn().mockResolvedValue([{ id: mockUser1.id, full_name: mockUser1.full_name, email: mockUser1.email, role: UserRole.USER }]),
        getUserGroups: vi.fn().mockResolvedValue([mockGroup1]),
        isMember: vi.fn().mockResolvedValue(false),
        addMember: vi.fn().mockResolvedValue(undefined),
        removeMember: vi.fn().mockResolvedValue(undefined),
        listAll: vi.fn().mockResolvedValue([mockGroup1, mockGroup2]),
        update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...mockGroup1, ...data })),
        delete: vi.fn().mockResolvedValue(undefined),
        getByField: vi.fn(),
        listByField: vi.fn(),
      },
      sessions: {
        create: vi.fn(),
        findByTokenHash: vi.fn(),
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
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('ListGroupsUseCase', () => {
    it('should list all groups with their respective member counts', async () => {
      const useCase = new ListGroupsUseCase(mockUow);
      const result = await useCase.execute();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Corpo Clínico');
      expect(result[0].member_count).toBe(2);
    });
  });

  describe('CreateGroupUseCase', () => {
    it('should successfully create a new group', async () => {
      vi.mocked(mockUow.groups.findByName).mockResolvedValue(null);
      vi.mocked(mockUow.groups.create).mockResolvedValue({
        id: 'new-grp-id',
        name: 'Enfermagem',
        description: 'Equipe de enfermagem',
        is_active: true,
        is_default: false,
        tenant_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });

      const useCase = new CreateGroupUseCase(mockUow);
      const result = await useCase.execute({
        name: 'Enfermagem',
        description: 'Equipe de enfermagem',
        is_active: true,
      });

      expect(result.data?.id).toBe('new-grp-id');
      expect(result.code).toBe(SuccessCode.GROUP_CREATED);
      expect(mockUow.groups.create).toHaveBeenCalled();
    });

    it('should throw ValidationError if description is missing or empty', async () => {
      const useCase = new CreateGroupUseCase(mockUow);
      await expect(useCase.execute({ name: 'Novo Grupo', description: '' })).rejects.toThrow(ValidationError);
    });

    it('should throw EntityAlreadyExistsError if group name already exists', async () => {
      const useCase = new CreateGroupUseCase(mockUow);
      await expect(useCase.execute({ name: 'Corpo Clínico', description: 'Médicos' })).rejects.toThrow(EntityAlreadyExistsError);
    });
  });

  describe('UpdateGroupUseCase', () => {
    it('should update group successfully', async () => {
      const useCase = new UpdateGroupUseCase(mockUow);
      const result = await useCase.execute('grp-1-id', {
        name: 'Corpo Clínico Atualizado',
        description: 'Nova descrição',
        is_active: true,
      });

      expect(result.data?.name).toBe('Corpo Clínico Atualizado');
      expect(result.code).toBe(SuccessCode.GROUP_UPDATED);
    });

    it('should throw ValidationError when updating description to empty string', async () => {
      const useCase = new UpdateGroupUseCase(mockUow);
      await expect(useCase.execute('grp-1-id', { description: '   ' })).rejects.toThrow(ValidationError);
    });

    it('should throw EntityNotFoundError when group does not exist', async () => {
      const useCase = new UpdateGroupUseCase(mockUow);
      await expect(useCase.execute('unknown-id', { name: 'Novo Nome', description: 'Desc' })).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('DeleteGroupUseCase', () => {
    it('should delete group successfully', async () => {
      const useCase = new DeleteGroupUseCase(mockUow);
      const result = await useCase.execute('grp-1-id');

      expect(result.code).toBe(SuccessCode.GROUP_DELETED);
      expect(mockUow.groups.delete).toHaveBeenCalledWith('grp-1-id');
    });

    it('should throw EntityNotFoundError when deleting nonexistent group', async () => {
      const useCase = new DeleteGroupUseCase(mockUow);
      await expect(useCase.execute('unknown-id')).rejects.toThrow(EntityNotFoundError);
    });

    it('should throw AccessDeniedError when trying to delete a default group', async () => {
      const useCase = new DeleteGroupUseCase(mockUow);
      await expect(useCase.execute(mockDefaultGroup.id)).rejects.toThrow(AccessDeniedError);
    });
  });

  describe('GetGroupMembersUseCase', () => {
    it('should return group members and available users', async () => {
      const useCase = new GetGroupMembersUseCase(mockUow);
      const result = await useCase.execute('grp-1-id');

      expect(result.group.id).toBe('grp-1-id');
      expect(result.members).toHaveLength(1);
      expect(result.members[0].full_name).toBe('Dr. Carlos Silva');
    });
  });

  describe('AddGroupMemberUseCase & RemoveGroupMemberUseCase', () => {
    it('should add member to group', async () => {
      const useCase = new AddGroupMemberUseCase(mockUow);
      const result = await useCase.execute('grp-1-id', 'usr-1-id');

      expect(result.code).toBe(SuccessCode.GROUP_MEMBER_ADDED);
      expect(mockUow.groups.addMember).toHaveBeenCalledWith('grp-1-id', 'usr-1-id');
    });

    it('should throw EntityAlreadyExistsError if user is already a member', async () => {
      vi.mocked(mockUow.groups.isMember).mockResolvedValue(true);
      const useCase = new AddGroupMemberUseCase(mockUow);

      await expect(useCase.execute('grp-1-id', 'usr-1-id')).rejects.toThrow(EntityAlreadyExistsError);
    });

    it('should remove member from group', async () => {
      vi.mocked(mockUow.groups.isMember).mockResolvedValue(true);
      const useCase = new RemoveGroupMemberUseCase(mockUow);
      const result = await useCase.execute('grp-1-id', 'usr-1-id');

      expect(result.code).toBe(SuccessCode.GROUP_MEMBER_REMOVED);
      expect(mockUow.groups.removeMember).toHaveBeenCalledWith('grp-1-id', 'usr-1-id');
    });

    it('should throw AccessDeniedError when trying to remove member from default group', async () => {
      const useCase = new RemoveGroupMemberUseCase(mockUow);
      await expect(useCase.execute(mockDefaultGroup.id, 'usr-1-id')).rejects.toThrow(AccessDeniedError);
    });
  });

  describe('GetUserGroupsUseCase & AddUserToGroupUseCase', () => {
    it('should return user groups and available groups', async () => {
      const useCase = new GetUserGroupsUseCase(mockUow);
      const result = await useCase.execute('usr-1-id');

      expect(result.user.id).toBe('usr-1-id');
      expect(result.groups).toHaveLength(1);
      expect(result.available_groups).toHaveLength(1);
      expect(result.available_groups[0].id).toBe('grp-2-id');
    });

    it('should link user to group', async () => {
      const useCase = new AddUserToGroupUseCase(mockUow);
      const result = await useCase.execute('usr-1-id', 'grp-2-id');

      expect(result.code).toBe(SuccessCode.GROUP_MEMBER_ADDED);
      expect(mockUow.groups.addMember).toHaveBeenCalledWith('grp-2-id', 'usr-1-id');
    });

    it('should unlink user from group', async () => {
      vi.mocked(mockUow.groups.isMember).mockResolvedValue(true);
      const useCase = new RemoveUserFromGroupUseCase(mockUow);
      const result = await useCase.execute('usr-1-id', 'grp-1-id');

      expect(result.code).toBe(SuccessCode.GROUP_MEMBER_REMOVED);
      expect(mockUow.groups.removeMember).toHaveBeenCalledWith('grp-1-id', 'usr-1-id');
    });

    it('should throw AccessDeniedError when trying to unlink user from default group', async () => {
      const useCase = new RemoveUserFromGroupUseCase(mockUow);
      await expect(useCase.execute('usr-1-id', mockDefaultGroup.id)).rejects.toThrow(AccessDeniedError);
    });
  });
});

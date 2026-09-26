import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IAMPermissionService } from '../../src/arch/application/services/iam-permission.service.js';
import { UserRole, ResourceAction, PermissionEffect, AccessDeniedError } from '@openclinic/core';

describe('IAMPermissionService (RBAC + ACL Resolution)', () => {
  let mockUow: any;
  let service: IAMPermissionService;

  const mockResources = [
    {
      id: 'res-root-pep',
      item_code: 'menu_pep',
      resource_type: 'MENU',
      context: 'BUSINESS',
      parent_id: null,
      min_role: 'USER',
      label_key: 'PEP',
      icon: 'file',
      route: '/pep',
      sort_order: 10,
      is_active: true,
    },
    {
      id: 'res-child-anamnese',
      item_code: 'pep_anamnese',
      resource_type: 'MENU_ITEM',
      context: 'BUSINESS',
      parent_id: 'res-root-pep',
      min_role: 'USER',
      label_key: 'Anamnese',
      icon: 'edit',
      route: '/pep/anamnese',
      sort_order: 11,
      is_active: true,
    },
    {
      id: 'res-billing',
      item_code: 'menu_billing',
      resource_type: 'MENU',
      context: 'BUSINESS',
      parent_id: null,
      min_role: 'ADMIN',
      label_key: 'Faturamento',
      icon: 'dollar',
      route: '/faturamento',
      sort_order: 40,
      is_active: true,
    },
    {
      id: 'res-sys-users',
      item_code: 'menu_sys_users',
      resource_type: 'MENU',
      context: 'ARCH',
      parent_id: null,
      min_role: 'ADMIN',
      label_key: 'Usuários & Grupos',
      icon: 'users',
      route: '/system/users',
      sort_order: 100,
      is_active: true,
    },
    {
      id: 'res-platform-settings',
      item_code: 'menu_platform_settings',
      resource_type: 'MENU',
      context: 'ARCH',
      parent_id: null,
      min_role: 'OWNER',
      label_key: 'Configurações da Plataforma',
      icon: 'sliders',
      route: '/platform/settings',
      sort_order: 200,
      is_active: true,
    },
  ];

  beforeEach(() => {
    mockUow = {
      users: {
        getById: vi.fn(),
      },
      groups: {
        getUserGroups: vi.fn().mockResolvedValue([]),
      },
      resources: {
        listAll: vi.fn().mockResolvedValue(mockResources),
        getTree: vi.fn().mockResolvedValue([
          {
            ...mockResources[0],
            children: [mockResources[1]],
          },
          mockResources[2],
        ]),
        getByItemCode: vi.fn((code: string) => {
          const res = mockResources.find((r) => r.item_code === code);
          return Promise.resolve(res || null);
        }),
      },
      permissions: {
        getAclMap: vi.fn().mockResolvedValue([]),
        listByUserId: vi.fn().mockResolvedValue([]),
        listByGroupId: vi.fn().mockResolvedValue([]),
        deleteByUser: vi.fn().mockResolvedValue(undefined),
        deleteByGroup: vi.fn().mockResolvedValue(undefined),
        create: vi.fn().mockResolvedValue({}),
      },
    };

    service = new IAMPermissionService(mockUow);
  });

  describe('RBAC Resolution', () => {
    it('should grant full access to OWNER including owner resources', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'owner-id',
        role: UserRole.OWNER,
      });

      const perms = await service.getUserPermissions('owner-id');
      expect(perms).toContain('menu_platform_settings');
      expect(perms).toContain('menu_sys_users');
      expect(perms).toContain('menu_pep');
      expect(perms).toContain('pep_anamnese');
      expect(perms.length).toBe(mockResources.length);
    });

    it('should grant ADMIN access based on assigned group ACL', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'admin-id',
        role: UserRole.ADMIN,
      });
      mockUow.groups.getUserGroups.mockResolvedValue([{ id: 'grp-admin', name: 'Administração' }]);
      mockUow.permissions.getAclMap.mockResolvedValue([
        {
          resource_id: 'res-sys-users',
          action: ResourceAction.READ,
          effect: PermissionEffect.ALLOW,
          user_id: null,
          group_id: 'grp-admin',
        },
      ]);

      const perms = await service.getUserPermissions('admin-id');
      expect(perms).toContain('menu_sys_users');
      expect(perms).not.toContain('menu_platform_settings');
      expect(perms).not.toContain('menu_billing');
    });

    it('should restrict basic USER without assigned permissions', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'user-id',
        role: UserRole.USER,
      });

      const perms = await service.getUserPermissions('user-id');
      expect(perms.length).toBe(0);
    });
  });

  describe('ACL Resolution & Group Inheritance', () => {
    it('should inherit permissions granted to user groups', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'user-id',
        role: UserRole.USER,
      });
      mockUow.groups.getUserGroups.mockResolvedValue([{ id: 'group-billing-id', name: 'Faturamento' }]);
      mockUow.permissions.getAclMap.mockResolvedValue([
        {
          resource_id: 'res-billing',
          action: ResourceAction.READ,
          effect: PermissionEffect.ALLOW,
          user_id: null,
          group_id: 'group-billing-id',
        },
      ]);

      const perms = await service.getUserPermissions('user-id');
      expect(perms).toContain('menu_billing');
    });

    it('should apply strict DENY > ALLOW precedence when user has explicit DENY', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'user-id',
        role: UserRole.USER,
      });
      mockUow.groups.getUserGroups.mockResolvedValue([{ id: 'group-billing-id', name: 'Faturamento' }]);
      mockUow.permissions.getAclMap.mockResolvedValue([
        {
          resource_id: 'res-billing',
          action: ResourceAction.READ,
          effect: PermissionEffect.ALLOW,
          user_id: null,
          group_id: 'group-billing-id',
        },
        {
          resource_id: 'res-billing',
          action: ResourceAction.READ,
          effect: PermissionEffect.DENY,
          user_id: 'user-id',
          group_id: null,
        },
      ]);

      const perms = await service.getUserPermissions('user-id');
      expect(perms).not.toContain('menu_billing');
    });
  });

  describe('Upward Propagation & Capabilities', () => {
    it('should propagate READ permission upward to parent when child has permission', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'user-id',
        role: UserRole.USER,
      });
      mockUow.groups.getUserGroups.mockResolvedValue([{ id: 'group-med-id', name: 'Médicos' }]);
      mockUow.permissions.getAclMap.mockResolvedValue([
        {
          resource_id: 'res-child-anamnese',
          action: ResourceAction.WRITE,
          effect: PermissionEffect.ALLOW,
          user_id: null,
          group_id: 'group-med-id',
        },
      ]);

      const capabilities = await service.getUserCapabilities('user-id');
      const rootCap = capabilities.find((c) => c.key === 'menu_pep');
      const childCap = capabilities.find((c) => c.key === 'pep_anamnese');

      expect(rootCap).toBeDefined();
      expect(rootCap?.actions).toContain(ResourceAction.READ);
      expect(childCap).toBeDefined();
      expect(childCap?.actions).toContain(ResourceAction.WRITE);
    });
  });

  describe('hasPermission verification', () => {
    it('should return true if user is OWNER', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'owner-id',
        role: UserRole.OWNER,
      });

      const allowed = await service.hasPermission('owner-id', 'menu_platform_settings', ResourceAction.MANAGE);
      expect(allowed).toBe(true);
    });

    it('should return true if capability matches requested action', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'user-id',
        role: UserRole.USER,
      });
      mockUow.permissions.getAclMap.mockResolvedValue([
        {
          resource_id: 'res-child-anamnese',
          action: ResourceAction.WRITE,
          effect: PermissionEffect.ALLOW,
          user_id: 'user-id',
          group_id: null,
        },
      ]);

      const canWrite = await service.hasPermission('user-id', 'pep_anamnese', ResourceAction.WRITE);
      expect(canWrite).toBe(true);
    });
  });

  describe('Role Hierarchy & Invariant Enforcement', () => {
    it('should NOT consolidate capabilities for resources requiring higher role than user role', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'user-id',
        role: UserRole.USER,
      });
      // Even if database has an ALLOW entry for an ADMIN resource (like menu_sys_users)
      mockUow.permissions.getAclMap.mockResolvedValue([
        {
          resource_id: 'res-sys-users',
          action: ResourceAction.READ,
          effect: PermissionEffect.ALLOW,
          user_id: 'user-id',
          group_id: null,
        },
      ]);

      const capabilities = await service.getUserCapabilities('user-id');
      const sysUsersCap = capabilities.find((c) => c.key === 'menu_sys_users');
      expect(sysUsersCap).toBeUndefined();
    });

    it('should throw DomainError when syncPermissions attempts to assign incompatible resource role to user', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'user-id',
        username: 'mariana.santos',
        role: UserRole.USER,
        tenant_id: 'tenant-id',
      });

      await expect(
        service.syncPermissions({
          user_id: 'user-id',
          permissions: [
            {
              resource_key: 'menu_sys_users', // requires ADMIN, but user is USER
              actions: [ResourceAction.READ],
              effect: PermissionEffect.ALLOW,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it('should succeed when syncPermissions assigns compatible resource role to user', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'user-id',
        username: 'mariana.santos',
        role: UserRole.USER,
        tenant_id: 'tenant-id',
      });
      mockUow.permissions.deleteByUser = vi.fn().mockResolvedValue(undefined);
      mockUow.permissions.create = vi.fn().mockResolvedValue({ id: 'new-perm-id' });

      const result = await service.syncPermissions({
        user_id: 'user-id',
        permissions: [
          {
            resource_key: 'menu_pep', // requires USER, user is USER
            actions: [ResourceAction.READ],
            effect: PermissionEffect.ALLOW,
          },
        ],
      });

      expect(result).toBe(true);
      expect(mockUow.permissions.deleteByUser).toHaveBeenCalledWith('user-id');
      expect(mockUow.permissions.create).toHaveBeenCalled();
    });

    it('should throw AccessDeniedError when syncPermissions attempts to modify permissions of an OWNER user', async () => {
      mockUow.users.getById.mockResolvedValue({
        id: 'owner-id',
        username: 'owner.master',
        role: UserRole.OWNER,
        tenant_id: 'tenant-id',
      });

      await expect(
        service.syncPermissions({
          user_id: 'owner-id',
          permissions: [
            {
              resource_key: 'menu_sys_users',
              actions: [ResourceAction.READ],
              effect: PermissionEffect.ALLOW,
            },
          ],
        })
      ).rejects.toThrow(AccessDeniedError);
    });

    it('should throw AccessDeniedError when non-owner operator attempts to assign platform/OWNER resource to a group', async () => {
      mockUow.groups.getById = vi.fn().mockResolvedValue({
        id: 'group-id',
        name: 'Administrativo',
        tenant_id: 'tenant-id',
      });

      await expect(
        service.syncPermissions(
          {
            group_id: 'group-id',
            permissions: [
              {
                resource_key: 'menu_platform_settings',
                actions: [ResourceAction.READ],
                effect: PermissionEffect.ALLOW,
              },
            ],
          },
          UserRole.ADMIN
        )
      ).rejects.toThrow(AccessDeniedError);
    });

    it('should succeed when OWNER operator assigns platform/OWNER resource to a group', async () => {
      mockUow.groups.getById = vi.fn().mockResolvedValue({
        id: 'group-id',
        name: 'Superusuários',
        tenant_id: 'tenant-id',
      });
      mockUow.permissions.deleteByGroup = vi.fn().mockResolvedValue(undefined);
      mockUow.permissions.create = vi.fn().mockResolvedValue({ id: 'perm-1' });

      const result = await service.syncPermissions(
        {
          group_id: 'group-id',
          permissions: [
            {
              resource_key: 'menu_platform_settings',
              actions: [ResourceAction.READ],
              effect: PermissionEffect.ALLOW,
            },
          ],
        },
        UserRole.OWNER
      );

      expect(result).toBe(true);
      expect(mockUow.permissions.deleteByGroup).toHaveBeenCalledWith('group-id');
      expect(mockUow.permissions.create).toHaveBeenCalled();
    });
  });
});

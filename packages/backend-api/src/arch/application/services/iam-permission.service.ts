import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type {
  IAMCapabilityDTO,
  ApplicationPermissionSyncDTO,
  NavigationMenuGroupDTO,
  NavigationMenuItemDTO,
  ResourceAction,
  ApplicationContext,
  UserRole,
} from '@openclinic/core';
import {
  UserRole as UserRoleEnum,
  ResourceAction as ActionEnum,
  PermissionEffect,
  ApplicationContext as ContextEnum,
  ROLE_HIERARCHY,
  DomainError,
  AccessDeniedError,
  EntityNotFoundError,
  ErrorCode,
} from '@openclinic/core';
import type { ApplicationResourceRecord, ResourceTreeNode } from '../../infrastructure/database/resource.repository.js';
import type { PermissionAclTuple } from '../../infrastructure/database/permission.repository.js';

export class IAMPermissionService {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.uow.users.getById(userId);
    if (!user) return [];

    const effectivePermissions = new Set<string>();
    const userRole: UserRole = user.role || UserRoleEnum.USER;

    // 1. OWNER tem acesso total
    const allResources = await this.uow.resources.listAll(1000);
    if (userRole === UserRoleEnum.OWNER) {
      return allResources.map((r: ApplicationResourceRecord) => r.item_code).sort();
    }

    // 2. Resolução de ACL (Grupos + Usuário com precedência de DENY)
    const userGroups = await this.uow.groups.getUserGroups(userId);
    const groupIds = userGroups.map((g) => g.id);
    const { allowMap, denyMap } = await this._getAclMap(userId, groupIds);

    const resById = new Map<string, string>();
    for (const r of allResources) {
      resById.set(r.id, r.item_code);
    }

    for (const resId of allowMap.keys()) {
      const code = resById.get(resId);
      if (code) {
        effectivePermissions.add(code);
      }
    }

    for (const resId of denyMap.keys()) {
      const code = resById.get(resId);
      if (code) {
        effectivePermissions.delete(code);
      }
    }

    return Array.from(effectivePermissions).sort();
  }

  async getUserCapabilities(userId: string): Promise<IAMCapabilityDTO[]> {
    const user = await this.uow.users.getById(userId);
    if (!user) return [];

    const userRole: UserRole = user.role || UserRoleEnum.USER;
    const allResources: ApplicationResourceRecord[] = await this.uow.resources.listAll(1000);

    const userGroups = await this.uow.groups.getUserGroups(userId);
    const groupIds = userGroups.map((g) => g.id);
    const { allowMap, denyMap } = await this._getAclMap(userId, groupIds);

    // Propaga leitura para os pais na árvore
    this._propagateAclUpward(allowMap, allResources);

    return this._consolidateCapabilities(userRole, allResources, allowMap, denyMap);
  }

  async getNavigationMenu(userId: string, context: ApplicationContext = ContextEnum.BUSINESS): Promise<NavigationMenuGroupDTO[]> {
    const capabilities = await this.getUserCapabilities(userId);
    const allowedKeys = new Set(capabilities.map((c) => c.key));

    const tree = await this.uow.resources.getTree(context);
    const filteredItems = this._filterTreeByCapabilities(tree, allowedKeys);

    return [
      {
        context,
        title: context === ContextEnum.BUSINESS ? 'Módulos Clínicos & Atendimento' : 'Administração do Sistema',
        items: filteredItems,
      },
    ];
  }

  async getUserAcl(userId: string): Promise<{ id: string; resource_key: string; actions: ResourceAction[]; effect: string }[]> {
    const perms = await this.uow.permissions.listByUserId(userId);
    const allResources = await this.uow.resources.listAll(1000);
    const resMap = new Map<string, string>();
    for (const r of allResources) {
      resMap.set(r.id, r.item_code);
    }

    const consolidated = new Map<string, { id: string; resource_key: string; actions: ResourceAction[]; effect: string }>();
    for (const p of perms) {
      const resKey = resMap.get(p.resource_id) || p.resource_id;
      const key = `${p.resource_id}:${p.effect}`;
      if (!consolidated.has(key)) {
        consolidated.set(key, {
          id: p.id,
          resource_key: resKey,
          actions: [],
          effect: p.effect,
        });
      }
      consolidated.get(key)!.actions.push(p.action);
    }

    return Array.from(consolidated.values());
  }

  async getGroupAcl(groupId: string): Promise<{ id: string; resource_key: string; actions: ResourceAction[]; effect: string }[]> {
    const perms = await this.uow.permissions.listByGroupId(groupId);
    const allResources = await this.uow.resources.listAll(1000);
    const resMap = new Map<string, string>();
    for (const r of allResources) {
      resMap.set(r.id, r.item_code);
    }

    const consolidated = new Map<string, { id: string; resource_key: string; actions: ResourceAction[]; effect: string }>();
    for (const p of perms) {
      const resKey = resMap.get(p.resource_id) || p.resource_id;
      const key = `${p.resource_id}:${p.effect}`;
      if (!consolidated.has(key)) {
        consolidated.set(key, {
          id: p.id,
          resource_key: resKey,
          actions: [],
          effect: p.effect,
        });
      }
      consolidated.get(key)!.actions.push(p.action);
    }

    return Array.from(consolidated.values());
  }

  async getUserInheritedAcl(userId: string): Promise<{ id: string; resource_key: string; actions: ResourceAction[]; effect: string }[]> {
    const userGroups = await this.uow.groups.getUserGroups(userId);
    if (!userGroups || userGroups.length === 0) return [];

    const groupIds = userGroups.map((g) => g.id);
    const allResources = await this.uow.resources.listAll(1000);
    const resMap = new Map<string, string>();
    for (const r of allResources) {
      resMap.set(r.id, r.item_code);
    }

    const consolidated = new Map<string, { id: string; resource_key: string; actions: Set<ResourceAction>; effect: string }>();
    for (const gId of groupIds) {
      const perms = await this.uow.permissions.listByGroupId(gId);
      for (const p of perms) {
        if (p.effect === PermissionEffect.DENY) continue;
        const resKey = resMap.get(p.resource_id) || p.resource_id;
        const key = `${p.resource_id}:ALLOW`;
        if (!consolidated.has(key)) {
          consolidated.set(key, {
            id: p.id,
            resource_key: resKey,
            actions: new Set<ResourceAction>(),
            effect: 'ALLOW',
          });
        }
        consolidated.get(key)!.actions.add(p.action);
      }
    }

    return Array.from(consolidated.values()).map((c) => ({
      id: c.id,
      resource_key: c.resource_key,
      actions: Array.from(c.actions),
      effect: c.effect,
    }));
  }

  async syncPermissions(payload: ApplicationPermissionSyncDTO, requesterRole?: UserRole): Promise<boolean> {
    const { user_id, group_id, permissions } = payload;
    if (!user_id && !group_id) return false;

    // Privilege Escalation Invariant: Non-OWNER operators cannot grant or modify permissions for resources requiring OWNER role
    if (requesterRole && requesterRole !== UserRoleEnum.OWNER) {
      for (const item of permissions) {
        if (item.effect === PermissionEffect.DENY) continue;
        const resource = await this.uow.resources.getByItemCode(item.resource_key);
        if (!resource) continue;
        const requiredLevel = ROLE_HIERARCHY[resource.min_role as UserRole] ?? 1;
        if (requiredLevel >= ROLE_HIERARCHY[UserRoleEnum.OWNER]) {
          throw new AccessDeniedError(ErrorCode.INSUFFICIENT_ROLE);
        }
      }
    }

    let tenantId: string | null = null;
    let targetUser: any = null;

    if (user_id) {
      targetUser = await this.uow.users.getById(user_id);
      if (!targetUser) {
        throw new EntityNotFoundError('User', user_id);
      }
      if (targetUser.role === UserRoleEnum.OWNER) {
        throw new AccessDeniedError(ErrorCode.OWNER_IMMUTABLE);
      }
      tenantId = targetUser.tenant_id ?? null;
    } else if (group_id) {
      const targetGroup = await this.uow.groups.getById(group_id);
      if (!targetGroup) {
        throw new EntityNotFoundError('Group', group_id);
      }
      tenantId = targetGroup.tenant_id ?? null;
    }

    if (!tenantId) {
      const defaultTenant = await this.uow.tenants?.getDefaultTenant();
      tenantId = defaultTenant?.id ?? null;
    }

    // Role Compatibility Invariant: direct user permission cannot exceed the user's role
    if (targetUser) {
      const userLevel = ROLE_HIERARCHY[targetUser.role as UserRole] ?? 1;
      for (const item of permissions) {
        if (item.effect === PermissionEffect.DENY) continue;
        const resource = await this.uow.resources.getByItemCode(item.resource_key);
        if (!resource) continue;
        const requiredLevel = ROLE_HIERARCHY[resource.min_role as UserRole] ?? 1;
        if (userLevel < requiredLevel) {
          throw new DomainError(
            ErrorCode.INCOMPATIBLE_RESOURCE_ROLE,
            undefined,
            {
              user: targetUser.username,
              user_role: targetUser.role,
              resource_key: item.resource_key,
              min_role: resource.min_role,
            }
          );
        }
      }
    }

    if (user_id) {
      await this.uow.permissions.deleteByUser(user_id);
    } else if (group_id) {
      await this.uow.permissions.deleteByGroup(group_id);
    }

    for (const item of permissions) {
      const resource = await this.uow.resources.getByItemCode(item.resource_key);
      if (!resource) continue;

      for (const action of item.actions) {
        await this.uow.permissions.create({
          user_id: user_id ?? null,
          group_id: group_id ?? null,
          resource_id: resource.id,
          action,
          effect: item.effect ?? PermissionEffect.ALLOW,
          tenant_id: tenantId,
        });
      }
    }

    return true;
  }

  async hasPermission(userId: string, resourceKey: string, requiredAction: ResourceAction = ActionEnum.READ): Promise<boolean> {
    const user = await this.uow.users.getById(userId);
    if (!user) return false;

    const userRole: UserRole = user.role || UserRoleEnum.USER;
    if (userRole === UserRoleEnum.OWNER) return true;

    const capabilities = await this.getUserCapabilities(userId);
    const capability = capabilities.find((c) => c.key === resourceKey);
    if (!capability) return false;

    if (capability.actions.includes(ActionEnum.ALL) || capability.actions.includes(ActionEnum.MANAGE)) {
      return true;
    }

    return capability.actions.includes(requiredAction);
  }

  private async _getAclMap(
    userId: string,
    groupIds: string[]
  ): Promise<{ allowMap: Map<string, Set<ResourceAction>>; denyMap: Map<string, Set<ResourceAction>> }> {
    const aclTuples: PermissionAclTuple[] = await this.uow.permissions.getAclMap(userId, groupIds);
    const allowMap = new Map<string, Set<ResourceAction>>();
    const denyMap = new Map<string, Set<ResourceAction>>();

    for (const item of aclTuples) {
      const resId = item.resource_id;
      const action = item.action;
      const effect = item.effect || PermissionEffect.ALLOW;
      const permUserId = item.user_id;

      // Negação individual do usuário tem prioridade
      if (permUserId === userId && effect === PermissionEffect.DENY) {
        if (!denyMap.has(resId)) denyMap.set(resId, new Set());
        denyMap.get(resId)!.add(action);
      } else if (effect !== PermissionEffect.DENY) {
        if (!allowMap.has(resId)) allowMap.set(resId, new Set());
        allowMap.get(resId)!.add(action);
      }
    }

    // Subtrai negações individuais
    const effectiveAllowMap = new Map<string, Set<ResourceAction>>();
    for (const [resId, actions] of allowMap.entries()) {
      const denied = denyMap.get(resId) || new Set();
      const remaining = new Set<ResourceAction>();
      for (const a of actions) {
        if (!denied.has(a)) {
          remaining.add(a);
        }
      }
      if (remaining.size > 0) {
        effectiveAllowMap.set(resId, remaining);
      }
    }

    return { allowMap: effectiveAllowMap, denyMap };
  }

  private _propagateAclUpward(allowMap: Map<string, Set<ResourceAction>>, allResources: ApplicationResourceRecord[]): void {
    const resById = new Map<string, ApplicationResourceRecord>();
    for (const r of allResources) {
      resById.set(r.id, r);
    }

    const currentKeys = Array.from(allowMap.keys());
    for (const resId of currentKeys) {
      let currentRes = resById.get(resId);
      while (currentRes && currentRes.parent_id) {
        const parent = resById.get(currentRes.parent_id);
        if (!parent) break;
        if (!allowMap.has(parent.id)) {
          allowMap.set(parent.id, new Set());
        }
        allowMap.get(parent.id)!.add(ActionEnum.READ);
        currentRes = parent;
      }
    }
  }

  private _consolidateCapabilities(
    userRole: UserRole,
    allResources: ApplicationResourceRecord[],
    allowMap: Map<string, Set<ResourceAction>>,
    denyMap: Map<string, Set<ResourceAction>>
  ): IAMCapabilityDTO[] {
    const capabilities: IAMCapabilityDTO[] = [];
    const userLevel = ROLE_HIERARCHY[userRole] ?? 1;

    for (const res of allResources) {
      if (!res.is_active) continue;

      // Role Invariant: users can never access resources requiring a higher role
      const requiredLevel = ROLE_HIERARCHY[res.min_role as UserRole] ?? 1;
      if (userLevel < requiredLevel) {
        continue;
      }

      const actions = new Set<ResourceAction>();

      // 1. OWNER tem acesso total e irrestrito (Superadmin)
      if (userRole === UserRoleEnum.OWNER) {
        actions.add(ActionEnum.READ);
        actions.add(ActionEnum.WRITE);
        actions.add(ActionEnum.DELETE);
        actions.add(ActionEnum.EXECUTE);
        actions.add(ActionEnum.MANAGE);
        actions.add(ActionEnum.ALL);
      }

      // 2. ACL (para ADMIN e USER as permissões são derivadas estritamente de seus Grupos e Atribuições Diretas)
      if (allowMap.has(res.id)) {
        for (const a of allowMap.get(res.id)!) {
          actions.add(a);
        }
      }

      // 3. Subtração de DENY
      if (userRole !== UserRoleEnum.OWNER && denyMap.has(res.id)) {
        for (const a of denyMap.get(res.id)!) {
          actions.delete(a);
        }
        if (denyMap.get(res.id)!.has(ActionEnum.READ)) {
          actions.clear();
        }
      }

      if (actions.size > 0) {
        capabilities.push({
          key: res.item_code,
          label: res.label_key || res.item_code,
          icon: res.icon,
          route: res.route,
          resource_type: res.resource_type,
          context: res.context,
          actions: Array.from(actions),
        });
      }
    }

    return capabilities;
  }

  private _filterTreeByCapabilities(tree: ResourceTreeNode[], allowedKeys: Set<string>): NavigationMenuItemDTO[] {
    const result: NavigationMenuItemDTO[] = [];

    for (const node of tree) {
      const isAllowed = allowedKeys.has(node.item_code);
      const filteredChildren = node.children ? this._filterTreeByCapabilities(node.children, allowedKeys) : [];

      if (isAllowed || filteredChildren.length > 0) {
        result.push({
          id: node.id,
          item_code: node.item_code,
          label: node.label_key || node.item_code,
          icon: node.icon,
          route: node.route,
          sort_order: node.sort_order,
          min_role: node.min_role,
          context: node.context,
          children: filteredChildren.length > 0 ? filteredChildren : undefined,
        });
      }
    }

    return result;
  }
}

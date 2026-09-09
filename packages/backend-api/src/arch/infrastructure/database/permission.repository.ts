import { eq, and, or, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { iamPermissions } from './drizzle-schema.js';
import type { ResourceAction, PermissionEffect } from '@openclinic/core';

export interface ApplicationPermissionRecord {
  id: string;
  user_id: string | null;
  group_id: string | null;
  resource_id: string;
  action: ResourceAction;
  effect: PermissionEffect;
  is_active: boolean;
  tenant_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PermissionAclTuple {
  resource_id: string;
  action: ResourceAction;
  effect: PermissionEffect;
  user_id: string | null;
  group_id: string | null;
}

export class PermissionRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async listByUserId(userId: string): Promise<ApplicationPermissionRecord[]> {
    const results = await this.db
      .select()
      .from(iamPermissions)
      .where(
        and(
          eq(iamPermissions.user_id, userId),
          eq(iamPermissions.is_active, true)
        )
      );
    return results as unknown as ApplicationPermissionRecord[];
  }

  async listByGroupId(groupId: string): Promise<ApplicationPermissionRecord[]> {
    const results = await this.db
      .select()
      .from(iamPermissions)
      .where(
        and(
          eq(iamPermissions.group_id, groupId),
          eq(iamPermissions.is_active, true)
        )
      );
    return results as unknown as ApplicationPermissionRecord[];
  }

  async listAll(): Promise<ApplicationPermissionRecord[]> {
    const results = await this.db
      .select()
      .from(iamPermissions)
      .where(eq(iamPermissions.is_active, true));
    return results as unknown as ApplicationPermissionRecord[];
  }

  async getAclMap(userId: string, groupIds: string[]): Promise<PermissionAclTuple[]> {
    const whereClause =
      groupIds.length > 0
        ? and(
            eq(iamPermissions.is_active, true),
            or(
              eq(iamPermissions.user_id, userId),
              inArray(iamPermissions.group_id, groupIds)
            )
          )
        : and(
            eq(iamPermissions.is_active, true),
            eq(iamPermissions.user_id, userId)
          );

    const rows = await this.db
      .select({
        resource_id: iamPermissions.resource_id,
        action: iamPermissions.action,
        effect: iamPermissions.effect,
        user_id: iamPermissions.user_id,
        group_id: iamPermissions.group_id,
      })
      .from(iamPermissions)
      .where(whereClause);

    return rows as unknown as PermissionAclTuple[];
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.db
      .delete(iamPermissions)
      .where(eq(iamPermissions.user_id, userId));
  }

  async deleteByGroup(groupId: string): Promise<void> {
    await this.db
      .delete(iamPermissions)
      .where(eq(iamPermissions.group_id, groupId));
  }

  async deleteById(id: string): Promise<void> {
    await this.db
      .delete(iamPermissions)
      .where(eq(iamPermissions.id, id));
  }

  async create(permission: {
    id?: string;
    user_id?: string | null;
    group_id?: string | null;
    resource_id: string;
    action: ResourceAction;
    effect?: PermissionEffect;
    tenant_id?: string | null;
  }): Promise<ApplicationPermissionRecord> {
    const id = permission.id || randomUUID();
    const [created] = await this.db
      .insert(iamPermissions)
      .values({
        id,
        user_id: permission.user_id ?? null,
        group_id: permission.group_id ?? null,
        resource_id: permission.resource_id,
        action: permission.action,
        effect: permission.effect ?? 'ALLOW',
        tenant_id: permission.tenant_id ?? null,
      })
      .returning();
    return created as unknown as ApplicationPermissionRecord;
  }
}

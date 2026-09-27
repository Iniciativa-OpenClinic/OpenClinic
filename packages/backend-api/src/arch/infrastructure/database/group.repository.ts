import { eq, and, or, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { iamGroups, iamUserGroups, iamUsers } from './drizzle-schema.js';
import type { IGroupRepository } from '../../domain/repositories.js';
import type { GroupEntity, UserEntity } from '../../domain/entities.js';
import type { GroupListItemDTO } from '../../domain/dtos.js';

export class GroupRepository implements IGroupRepository {
  constructor(private db: PostgresJsDatabase) {}

  async create(entity: Partial<GroupEntity>): Promise<GroupEntity> {
    const id = entity.id || randomUUID();
    const [group] = await this.db.insert(iamGroups).values({ ...entity, id } as typeof iamGroups.$inferInsert).returning();
    return group as unknown as GroupEntity;
  }

  async getById(id: string): Promise<GroupEntity | null> {
    const [group] = await this.db
      .select()
      .from(iamGroups)
      .where(and(eq(iamGroups.id, id), isNull(iamGroups.deleted_at)))
      .limit(1);
    return (group as unknown as GroupEntity) ?? null;
  }

  async findByName(name: string, tenantId?: string): Promise<GroupEntity | null> {
    const conditions = tenantId
      ? and(eq(iamGroups.name, name), isNull(iamGroups.deleted_at), or(eq(iamGroups.tenant_id, tenantId), isNull(iamGroups.tenant_id)))
      : and(eq(iamGroups.name, name), isNull(iamGroups.deleted_at));
    const [group] = await this.db.select().from(iamGroups).where(conditions).limit(1);
    return (group as unknown as GroupEntity) ?? null;
  }

  async getDefaultGroup(tenantId?: string): Promise<GroupEntity | null> {
    const conditions = tenantId
      ? and(eq(iamGroups.is_default, true), isNull(iamGroups.deleted_at), or(eq(iamGroups.tenant_id, tenantId), isNull(iamGroups.tenant_id)))
      : and(eq(iamGroups.is_default, true), isNull(iamGroups.deleted_at));
    const [group] = await this.db.select().from(iamGroups).where(conditions).limit(1);
    return (group as unknown as GroupEntity) ?? null;
  }

  async findAllWithMemberCount(tenantId?: string): Promise<GroupListItemDTO[]> {
    const query = this.db
      .select({
        id: iamGroups.id,
        name: iamGroups.name,
        description: iamGroups.description,
        is_active: iamGroups.is_active,
        is_default: iamGroups.is_default,
        tenant_id: iamGroups.tenant_id,
        created_at: iamGroups.created_at,
        updated_at: iamGroups.updated_at,
        deleted_at: iamGroups.deleted_at,
        member_count: sql<number>`count(${iamUserGroups.id})::int`,
      })
      .from(iamGroups)
      .leftJoin(iamUserGroups, eq(iamGroups.id, iamUserGroups.group_id))
      .groupBy(iamGroups.id);

    if (tenantId) {
      query.where(and(isNull(iamGroups.deleted_at), or(eq(iamGroups.tenant_id, tenantId), isNull(iamGroups.tenant_id))));
    } else {
      query.where(isNull(iamGroups.deleted_at));
    }

    const groups = await query;
    return groups as unknown as GroupListItemDTO[];
  }

  async update(id: string, entity: Partial<GroupEntity>): Promise<GroupEntity> {
    const [updated] = await this.db
      .update(iamGroups)
      .set({ ...entity, updated_at: new Date() } as typeof iamGroups.$inferInsert)
      .where(eq(iamGroups.id, id))
      .returning();
    return updated as unknown as GroupEntity;
  }

  async delete(id: string): Promise<boolean> {
    const [updated] = await this.db
      .update(iamGroups)
      .set({ is_active: false, deleted_at: new Date(), updated_at: new Date() })
      .where(eq(iamGroups.id, id))
      .returning();
    return !!updated;
  }

  async getMembers(groupId: string): Promise<UserEntity[]> {
    const members = await this.db
      .select({
        user: iamUsers,
      })
      .from(iamUserGroups)
      .innerJoin(iamUsers, eq(iamUserGroups.user_id, iamUsers.id))
      .where(eq(iamUserGroups.group_id, groupId));

    return members.map((m) => m.user) as unknown as UserEntity[];
  }

  async getUserGroups(userId: string): Promise<GroupEntity[]> {
    const groups = await this.db
      .select({
        id: iamGroups.id,
        name: iamGroups.name,
        description: iamGroups.description,
        is_active: iamGroups.is_active,
        is_default: iamGroups.is_default,
        tenant_id: iamGroups.tenant_id,
        created_at: iamGroups.created_at,
        updated_at: iamGroups.updated_at,
        deleted_at: iamGroups.deleted_at,
      })
      .from(iamUserGroups)
      .innerJoin(iamGroups, eq(iamUserGroups.group_id, iamGroups.id))
      .where(and(eq(iamUserGroups.user_id, userId), isNull(iamGroups.deleted_at)));

    return groups as unknown as GroupEntity[];
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: iamUserGroups.id })
      .from(iamUserGroups)
      .where(and(eq(iamUserGroups.group_id, groupId), eq(iamUserGroups.user_id, userId)))
      .limit(1);
    return !!row;
  }

  async addMember(groupId: string, userId: string): Promise<void> {
    const id = randomUUID();
    await this.db
      .insert(iamUserGroups)
      .values({
        id,
        group_id: groupId,
        user_id: userId,
      })
      .onConflictDoNothing();
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.db
      .delete(iamUserGroups)
      .where(and(eq(iamUserGroups.group_id, groupId), eq(iamUserGroups.user_id, userId)));
  }

  async listAll(skip = 0, limit = 100): Promise<GroupEntity[]> {
    const groups = await this.db
      .select()
      .from(iamGroups)
      .where(isNull(iamGroups.deleted_at))
      .offset(skip)
      .limit(limit);
    return groups as unknown as GroupEntity[];
  }

  async getByField(fieldName: string, value: unknown): Promise<GroupEntity | null> {
    const col = (iamGroups as unknown as Record<string, unknown>)[fieldName];
    if (!col) return null;
    const [group] = await this.db
      .select()
      .from(iamGroups)
      .where(and(eq(col as typeof iamGroups.id, value as string), isNull(iamGroups.deleted_at)))
      .limit(1);
    return (group as unknown as GroupEntity) ?? null;
  }

  async listByField(fieldName: string, value: unknown): Promise<GroupEntity[]> {
    const col = (iamGroups as unknown as Record<string, unknown>)[fieldName];
    if (!col) return [];
    const groups = await this.db
      .select()
      .from(iamGroups)
      .where(and(eq(col as typeof iamGroups.id, value as string), isNull(iamGroups.deleted_at)));
    return groups as unknown as GroupEntity[];
  }
}

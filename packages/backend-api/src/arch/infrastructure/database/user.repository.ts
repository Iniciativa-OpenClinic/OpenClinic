import { eq, or, and, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { iamUsers } from './drizzle-schema.js';
import type { IUserRepository } from '../../domain/repositories.js';
import type { UserEntity } from '../../domain/entities.js';

export class UserRepository implements IUserRepository {
  constructor(private db: PostgresJsDatabase) {}

  async create(entity: Partial<UserEntity>): Promise<UserEntity> {
    const id = entity.id || randomUUID();
    const [user] = await this.db.insert(iamUsers).values({ ...entity, id } as typeof iamUsers.$inferInsert).returning();
    return user as unknown as UserEntity;
  }

  async getById(id: string): Promise<UserEntity | null> {
    const [user] = await this.db
      .select()
      .from(iamUsers)
      .where(and(eq(iamUsers.id, id), isNull(iamUsers.deleted_at)))
      .limit(1);
    return (user as unknown as UserEntity) ?? null;
  }

  async getByIdentifier(identifier: string): Promise<UserEntity | null> {
    const cleanDigits = identifier.replace(/\D/g, '');
    const orConditions = [
      eq(iamUsers.email, identifier),
      eq(iamUsers.username, identifier),
    ];
    if (cleanDigits.length === 11) {
      orConditions.push(eq(iamUsers.cpf, cleanDigits));
    }

    const [user] = await this.db
      .select()
      .from(iamUsers)
      .where(
        and(
          or(...orConditions),
          isNull(iamUsers.deleted_at)
        )
      )
      .limit(1);
    return (user as unknown as UserEntity) ?? null;
  }

  async getByEmail(email: string, tenantId?: string): Promise<UserEntity | null> {
    const conditions = tenantId
      ? and(
          eq(iamUsers.email, email),
          or(eq(iamUsers.tenant_id, tenantId), isNull(iamUsers.tenant_id)),
          isNull(iamUsers.deleted_at)
        )
      : and(eq(iamUsers.email, email), isNull(iamUsers.deleted_at));
    const [user] = await this.db.select().from(iamUsers).where(conditions).limit(1);
    return (user as unknown as UserEntity) ?? null;
  }

  async listAll(skip = 0, limit = 100): Promise<UserEntity[]> {
    const users = await this.db
      .select()
      .from(iamUsers)
      .where(isNull(iamUsers.deleted_at))
      .offset(skip)
      .limit(limit);
    return users as unknown as UserEntity[];
  }

  async update(id: string, entity: Partial<UserEntity>): Promise<UserEntity> {
    const [updated] = await this.db
      .update(iamUsers)
      .set({ ...entity, updated_at: new Date() } as typeof iamUsers.$inferInsert)
      .where(and(eq(iamUsers.id, id), isNull(iamUsers.deleted_at)))
      .returning();
    return updated as unknown as UserEntity;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .update(iamUsers)
      .set({ is_active: false, deleted_at: new Date(), updated_at: new Date() })
      .where(and(eq(iamUsers.id, id), isNull(iamUsers.deleted_at)))
      .returning();
    return result.length > 0;
  }

  async getByField(fieldName: string, value: unknown): Promise<UserEntity | null> {
    const col = (iamUsers as unknown as Record<string, unknown>)[fieldName];
    if (!col) return null;
    const [user] = await this.db
      .select()
      .from(iamUsers)
      .where(and(eq(col as typeof iamUsers.id, value as string), isNull(iamUsers.deleted_at)))
      .limit(1);
    return (user as unknown as UserEntity) ?? null;
  }

  async listByField(fieldName: string, value: unknown): Promise<UserEntity[]> {
    const col = (iamUsers as unknown as Record<string, unknown>)[fieldName];
    if (!col) return [];
    const users = await this.db
      .select()
      .from(iamUsers)
      .where(and(eq(col as typeof iamUsers.id, value as string), isNull(iamUsers.deleted_at)));
    return users as unknown as UserEntity[];
  }
}

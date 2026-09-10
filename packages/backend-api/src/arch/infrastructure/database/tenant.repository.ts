import { eq, and, isNull, desc, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { sysTenants } from './drizzle-schema.js';
import type { ITenantRepository } from '../../domain/repositories.js';
import type { TenantEntity } from '../../domain/entities.js';

export class TenantRepository implements ITenantRepository {
  constructor(private db: PostgresJsDatabase) {}

  async create(entity: Partial<TenantEntity>): Promise<TenantEntity> {
    const id = entity.id || randomUUID();
    if (entity.is_default) {
      await this.db.update(sysTenants).set({ is_default: false });
    }
    const [tenant] = await this.db.insert(sysTenants).values({ ...entity, id } as typeof sysTenants.$inferInsert).returning();
    return tenant as unknown as TenantEntity;
  }

  async getById(id: string): Promise<TenantEntity | null> {
    const [tenant] = await this.db
      .select()
      .from(sysTenants)
      .where(and(eq(sysTenants.id, id), isNull(sysTenants.deleted_at)))
      .limit(1);
    return (tenant as unknown as TenantEntity) ?? null;
  }

  async getDefaultTenant(): Promise<TenantEntity | null> {
    const [tenant] = await this.db
      .select()
      .from(sysTenants)
      .where(and(eq(sysTenants.is_default, true), eq(sysTenants.is_active, true), isNull(sysTenants.deleted_at)))
      .limit(1);

    if (tenant) {
      return tenant as unknown as TenantEntity;
    }

    const [fallbackTenant] = await this.db
      .select()
      .from(sysTenants)
      .where(and(eq(sysTenants.is_active, true), isNull(sysTenants.deleted_at)))
      .limit(1);

    return (fallbackTenant as unknown as TenantEntity) ?? null;
  }

  async getBySlug(slug: string): Promise<TenantEntity | null> {
    const [tenant] = await this.db
      .select()
      .from(sysTenants)
      .where(and(eq(sysTenants.slug, slug), isNull(sysTenants.deleted_at)))
      .limit(1);
    return (tenant as unknown as TenantEntity) ?? null;
  }

  async listAll(skip = 0, limit = 100): Promise<TenantEntity[]> {
    return (await this.db
      .select()
      .from(sysTenants)
      .where(isNull(sysTenants.deleted_at))
      .orderBy(desc(sysTenants.is_default), asc(sysTenants.name))
      .offset(skip)
      .limit(limit)) as unknown as TenantEntity[];
  }

  async update(id: string, entity: Partial<TenantEntity>): Promise<TenantEntity> {
    if (entity.is_default) {
      await this.db.update(sysTenants).set({ is_default: false });
    }
    const [updated] = await this.db
      .update(sysTenants)
      .set({ ...entity, updated_at: new Date() } as typeof sysTenants.$inferInsert)
      .where(eq(sysTenants.id, id))
      .returning();
    return updated as unknown as TenantEntity;
  }

  async delete(id: string): Promise<boolean> {
    const [updated] = await this.db
      .update(sysTenants)
      .set({ is_active: false, deleted_at: new Date(), updated_at: new Date() })
      .where(eq(sysTenants.id, id))
      .returning();
    return !!updated;
  }

  async getByField(fieldName: string, value: unknown): Promise<TenantEntity | null> {
    const col = (sysTenants as unknown as Record<string, unknown>)[fieldName];
    if (!col) return null;
    const [tenant] = await this.db.select().from(sysTenants).where(eq(col as typeof sysTenants.id, value as string)).limit(1);
    return (tenant as unknown as TenantEntity) ?? null;
  }

  async listByField(fieldName: string, value: unknown): Promise<TenantEntity[]> {
    const col = (sysTenants as unknown as Record<string, unknown>)[fieldName];
    if (!col) return [];
    return (await this.db.select().from(sysTenants).where(eq(col as typeof sysTenants.id, value as string))) as unknown as TenantEntity[];
  }
}

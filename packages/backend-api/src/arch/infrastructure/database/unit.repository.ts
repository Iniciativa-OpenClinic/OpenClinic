import { randomUUID } from 'node:crypto';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { UnitInput, UnitRepository } from '../../domain/unit.js';
import { appOrganizationUnits, appOrganizations } from './drizzle-schema.js';

export class PostgresUnitRepository implements UnitRepository {
  constructor(private readonly db: PostgresJsDatabase, private readonly tenantId: string) {
    if (!tenantId) throw new Error('Unit repository requires a tenant');
  }

  async organizationExists(id: string): Promise<boolean> {
    const [organization] = await this.db.select({ id: appOrganizations.id }).from(appOrganizations)
      .where(and(eq(appOrganizations.id, id), eq(appOrganizations.tenant_id, this.tenantId), isNull(appOrganizations.deleted_at))).limit(1);
    return Boolean(organization);
  }
  private scope(id?: string) {
    return and(eq(appOrganizationUnits.tenant_id, this.tenantId), isNull(appOrganizationUnits.deleted_at),
      id === undefined ? undefined : eq(appOrganizationUnits.id, id));
  }

  async list({ offset, limit }: { offset: number; limit: number }) {
    const items = await this.db.select().from(appOrganizationUnits).where(this.scope())
      .orderBy(asc(appOrganizationUnits.name), asc(appOrganizationUnits.id)).offset(offset).limit(limit);
    const [result] = await this.db.select({ total: count() }).from(appOrganizationUnits).where(this.scope());
    return { items, total: result.total };
  }

  async getById(id: string) {
    const [unit] = await this.db.select().from(appOrganizationUnits).where(this.scope(id)).limit(1);
    return unit ?? null;
  }

  async create(input: UnitInput) {
    const [unit] = await this.db.insert(appOrganizationUnits)
      .values({ ...input, id: randomUUID(), tenant_id: this.tenantId }).returning();
    return unit;
  }

  async update(id: string, input: Partial<UnitInput>) {
    const [unit] = await this.db.update(appOrganizationUnits).set({ ...input, updated_at: new Date() })
      .where(this.scope(id)).returning();
    return unit ?? null;
  }

  async softDelete(id: string) {
    const now = new Date();
    await this.db.update(appOrganizationUnits).set({ is_active: false, deleted_at: now, updated_at: now })
      .where(this.scope(id));
  }
}

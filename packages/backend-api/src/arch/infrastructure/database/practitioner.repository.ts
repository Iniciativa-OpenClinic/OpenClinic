import { randomUUID } from 'node:crypto';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { PractitionerInput, PractitionerRepository } from '../../domain/practitioner.js';
import { appPractitioners } from './drizzle-schema.js';

export class PostgresPractitionerRepository implements PractitionerRepository {
  constructor(private readonly db: PostgresJsDatabase, private readonly tenantId: string) {
    if (!tenantId) throw new Error('Practitioner repository requires a tenant');
  }

  private scope(id?: string) {
    return and(eq(appPractitioners.tenant_id, this.tenantId), isNull(appPractitioners.deleted_at),
      id === undefined ? undefined : eq(appPractitioners.id, id));
  }

  async list({ offset, limit }: { offset: number; limit: number }) {
    const items = await this.db.select().from(appPractitioners).where(this.scope())
      .orderBy(asc(appPractitioners.full_name), asc(appPractitioners.id)).offset(offset).limit(limit);
    const [result] = await this.db.select({ total: count() }).from(appPractitioners).where(this.scope());
    return { items, total: result.total };
  }

  async getById(id: string) {
    const [practitioner] = await this.db.select().from(appPractitioners).where(this.scope(id)).limit(1);
    return practitioner ?? null;
  }

  async create(input: PractitionerInput) {
    const [practitioner] = await this.db.insert(appPractitioners)
      .values({ ...input, id: randomUUID(), tenant_id: this.tenantId }).returning();
    return practitioner;
  }

  async update(id: string, input: Partial<PractitionerInput>) {
    const [practitioner] = await this.db.update(appPractitioners).set({ ...input, updated_at: new Date() })
      .where(this.scope(id)).returning();
    return practitioner ?? null;
  }

  async softDelete(id: string) {
    const now = new Date();
    await this.db.update(appPractitioners).set({ is_active: false, deleted_at: now, updated_at: now })
      .where(this.scope(id));
  }
}

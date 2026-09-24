import { randomUUID } from 'node:crypto';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { PatientInput, PatientRepository } from '../../domain/patient.js';
import { appPatients } from './drizzle-schema.js';

export class PostgresPatientRepository implements PatientRepository {
  constructor(private readonly db: PostgresJsDatabase, private readonly tenantId: string) {
    if (!tenantId) throw new Error('Patient repository requires a tenant');
  }

  private scope(id?: string) {
    return and(eq(appPatients.tenant_id, this.tenantId), isNull(appPatients.deleted_at),
      id === undefined ? undefined : eq(appPatients.id, id));
  }

  async list({ offset, limit }: { offset: number; limit: number }) {
    const items = await this.db.select().from(appPatients).where(this.scope())
      .orderBy(asc(appPatients.full_name), asc(appPatients.id)).offset(offset).limit(limit);
    const [result] = await this.db.select({ total: count() }).from(appPatients).where(this.scope());
    return { items, total: result.total };
  }

  async getById(id: string) {
    const [patient] = await this.db.select().from(appPatients).where(this.scope(id)).limit(1);
    return patient ?? null;
  }

  async create(input: PatientInput) {
    const [patient] = await this.db.insert(appPatients)
      .values({ ...input, id: randomUUID(), tenant_id: this.tenantId }).returning();
    return patient;
  }

  async update(id: string, input: Partial<PatientInput>) {
    const [patient] = await this.db.update(appPatients).set({ ...input, updated_at: new Date() })
      .where(this.scope(id)).returning();
    return patient ?? null;
  }

  async softDelete(id: string) {
    const now = new Date();
    await this.db.update(appPatients).set({ is_active: false, deleted_at: now, updated_at: now })
      .where(this.scope(id));
  }
}

import { randomUUID } from 'node:crypto';
import { ValidationError } from '@openclinic/core';
import { and, asc, count, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { ProcedureInput, ProcedureListOptions, ProcedureRepository } from '../../domain/procedure.js';
import { appPractitioners, appProcedurePractitioners, appProcedures } from './drizzle-schema.js';

type Transaction = Parameters<Parameters<PostgresJsDatabase['transaction']>[0]>[0];
type Database = PostgresJsDatabase | Transaction;

export class PostgresProcedureRepository implements ProcedureRepository {
  constructor(private readonly db: PostgresJsDatabase, private readonly tenantId: string) {
    if (!tenantId) throw new Error('Procedure repository requires a tenant');
  }

  private scope(id?: string) {
    return and(eq(appProcedures.tenant_id, this.tenantId), isNull(appProcedures.deleted_at),
      id === undefined ? undefined : eq(appProcedures.id, id));
  }

  private async withPractitioners(db: Database, rows: (typeof appProcedures.$inferSelect)[]) {
    if (!rows.length) return [];
    const links = await db.select().from(appProcedurePractitioners)
      .where(and(eq(appProcedurePractitioners.tenant_id, this.tenantId), inArray(appProcedurePractitioners.procedure_id, rows.map(row => row.id))))
      .orderBy(asc(appProcedurePractitioners.practitioner_id));
    const ids = new Map<string, string[]>();
    for (const link of links) {
      const values = ids.get(link.procedure_id) ?? [];
      values.push(link.practitioner_id);
      ids.set(link.procedure_id, values);
    }
    return rows.map(row => ({ ...row, practitioner_ids: ids.get(row.id) ?? [] }));
  }

  async list({ offset, limit, is_active, q }: ProcedureListOptions) {
    // Treat user search text literally, including SQL LIKE wildcards.
    const search = q === undefined ? undefined : `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const where = and(this.scope(), is_active === undefined ? undefined : eq(appProcedures.is_active, is_active),
      search === undefined ? undefined : or(ilike(appProcedures.name, search), ilike(appProcedures.tuss_code, search)));
    const rows = await this.db.select().from(appProcedures).where(where)
      .orderBy(asc(appProcedures.name), asc(appProcedures.id)).offset(offset).limit(limit);
    const [result] = await this.db.select({ total: count() }).from(appProcedures).where(where);
    return { items: await this.withPractitioners(this.db, rows), total: result.total };
  }

  async getById(id: string) {
    const rows = await this.db.select().from(appProcedures).where(this.scope(id)).limit(1);
    return (await this.withPractitioners(this.db, rows))[0] ?? null;
  }

  private async replacePractitioners(tx: Transaction, procedureId: string, ids: string[]) {
    if (ids.length) {
      // Lock referenced professionals until commit, preventing concurrent soft deletion during validation.
      const found = await tx.select({ id: appPractitioners.id }).from(appPractitioners)
        .where(and(eq(appPractitioners.tenant_id, this.tenantId), isNull(appPractitioners.deleted_at),
          eq(appPractitioners.is_active, true), inArray(appPractitioners.id, ids)))
        .orderBy(asc(appPractitioners.id)).for('share');
      if (found.length !== ids.length) throw new ValidationError('practitioner_ids', 'All practitioners must be active and belong to the current tenant');
    }
    await tx.delete(appProcedurePractitioners).where(and(eq(appProcedurePractitioners.tenant_id, this.tenantId), eq(appProcedurePractitioners.procedure_id, procedureId)));
    if (ids.length) await tx.insert(appProcedurePractitioners).values(ids.map(practitioner_id => ({
      tenant_id: this.tenantId, procedure_id: procedureId, practitioner_id,
    })));
  }

  async create({ practitioner_ids = [], ...input }: ProcedureInput) {
    return this.db.transaction(async tx => {
      const [row] = await tx.insert(appProcedures).values({ ...input, id: randomUUID(), tenant_id: this.tenantId }).returning();
      await this.replacePractitioners(tx, row.id, practitioner_ids);
      return { ...row, practitioner_ids: [...practitioner_ids].sort() };
    });
  }

  async update(id: string, { practitioner_ids, ...input }: Partial<ProcedureInput>) {
    return this.db.transaction(async tx => {
      // The row lock serializes concurrent relationship replacements and deletion.
      const [row] = await tx.update(appProcedures).set({ ...input, updated_at: new Date() }).where(this.scope(id)).returning();
      if (!row) return null;
      if (practitioner_ids !== undefined) await this.replacePractitioners(tx, id, practitioner_ids);
      return (await this.withPractitioners(tx, [row]))[0];
    });
  }

  async softDelete(id: string) {
    const now = new Date();
    const rows = await this.db.update(appProcedures).set({ is_active: false, deleted_at: now, updated_at: now })
      .where(this.scope(id)).returning({ id: appProcedures.id });
    return rows.length > 0;
  }
}

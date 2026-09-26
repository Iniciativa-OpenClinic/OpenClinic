import { randomUUID } from 'node:crypto';
import { ValidationError } from '@openclinic/core';
import { and, asc, count, eq, isNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { BlockFilters, BlockOccurrence, BlockOccurrenceFilters, ScheduleBlockInput, ScheduleBlockRepository } from '../../domain/schedule-block.js';
import { validateBlock, validateOccurrenceRange } from '../../application/services/schedule-block.service.js';
import { appOrganizationUnits, appPractitioners, appRooms, appScheduleBlocks } from './drizzle-schema.js';

type Transaction = Parameters<Parameters<PostgresJsDatabase['transaction']>[0]>[0];
export class PostgresScheduleBlockRepository implements ScheduleBlockRepository {
  constructor(private readonly db: PostgresJsDatabase, private readonly tenantId: string) {
    if (!tenantId) throw new Error('Schedule block repository requires a tenant');
  }
  private scope(id?: string) {
    return and(eq(appScheduleBlocks.tenant_id, this.tenantId), isNull(appScheduleBlocks.deleted_at),
      id === undefined ? undefined : eq(appScheduleBlocks.id, id));
  }
  private filters({ unit_id, practitioner_id, room_id }: BlockFilters) {
    return and(this.scope(), unit_id === undefined ? undefined : or(eq(appScheduleBlocks.unit_id, unit_id),
      and(isNull(appScheduleBlocks.unit_id), or(isNull(appScheduleBlocks.room_id), sql`EXISTS (
        SELECT 1 FROM ${appRooms} WHERE ${appRooms.tenant_id} = ${this.tenantId}
          AND ${appRooms.id} = ${appScheduleBlocks.room_id} AND ${appRooms.unit_id} = ${unit_id}
      )`))),
      practitioner_id === undefined ? undefined : eq(appScheduleBlocks.practitioner_id, practitioner_id),
      room_id === undefined ? undefined : eq(appScheduleBlocks.room_id, room_id));
  }
  private async validateResource(tx: Transaction, input: ScheduleBlockInput) {
    const zones = await tx.execute(sql`SELECT name FROM pg_timezone_names WHERE name = ${input.timezone}`);
    if (!zones.length) throw new ValidationError('timezone', 'Timezone is not supported by the database');
    if (input.unit_id) {
      const [unit] = await tx.select({ id: appOrganizationUnits.id }).from(appOrganizationUnits)
        .where(and(eq(appOrganizationUnits.tenant_id, this.tenantId), eq(appOrganizationUnits.id, input.unit_id),
          eq(appOrganizationUnits.is_active, true), isNull(appOrganizationUnits.deleted_at))).limit(1).for('share');
      if (!unit) throw new ValidationError('unit_id', 'Unit must be active in the current tenant');
    }
    if (input.practitioner_id) {
      const [practitioner] = await tx.select({ id: appPractitioners.id }).from(appPractitioners)
        .where(and(eq(appPractitioners.tenant_id, this.tenantId), eq(appPractitioners.id, input.practitioner_id),
          eq(appPractitioners.is_active, true), isNull(appPractitioners.deleted_at))).limit(1).for('share');
      if (!practitioner) throw new ValidationError('practitioner_id', 'Practitioner must be active in the current tenant');
    } else {
      const [room] = await tx.select({ id: appRooms.id }).from(appRooms)
        .where(and(eq(appRooms.tenant_id, this.tenantId), eq(appRooms.id, input.room_id!),
          input.unit_id ? eq(appRooms.unit_id, input.unit_id) : undefined,
          eq(appRooms.is_active, true), eq(appRooms.is_schedulable, true), isNull(appRooms.deleted_at))).limit(1).for('share');
      if (!room) throw new ValidationError('room_id', 'Room must be active, schedulable and match the selected unit');
    }
  }
  async list(options: BlockFilters) {
    const where = this.filters(options);
    const items = await this.db.select().from(appScheduleBlocks).where(where)
      .orderBy(asc(appScheduleBlocks.starts_at), asc(appScheduleBlocks.id)).offset(options.offset).limit(options.limit);
    const [result] = await this.db.select({ total: count() }).from(appScheduleBlocks).where(where);
    return { items, total: result.total };
  }
  async getById(id: string) {
    const [row] = await this.db.select().from(appScheduleBlocks).where(this.scope(id)).limit(1);
    return row ?? null;
  }
  async create(input: ScheduleBlockInput) {
    validateBlock(input);
    return this.db.transaction(async tx => {
      await this.validateResource(tx, input);
      const [row] = await tx.insert(appScheduleBlocks).values({ ...input, id: randomUUID(), tenant_id: this.tenantId,
        starts_at: new Date(input.starts_at), ends_at: new Date(input.ends_at) }).returning();
      return row;
    });
  }
  async update(id: string, input: Partial<ScheduleBlockInput>) {
    return this.db.transaction(async tx => {
      const [old] = await tx.select().from(appScheduleBlocks).where(this.scope(id)).limit(1).for('update');
      if (!old) return null;
      const merged: ScheduleBlockInput = { ...old, starts_at: old.starts_at.toISOString(), ends_at: old.ends_at.toISOString(), ...input };
      validateBlock(merged);
      await this.validateResource(tx, merged);
      const [row] = await tx.update(appScheduleBlocks).set({ ...input,
        starts_at: new Date(merged.starts_at), ends_at: new Date(merged.ends_at), updated_at: new Date() }).where(this.scope(id)).returning();
      return row;
    });
  }
  async softDelete(id: string) {
    const now = new Date();
    const rows = await this.db.update(appScheduleBlocks).set({ deleted_at: now, updated_at: now }).where(this.scope(id)).returning({ id: appScheduleBlocks.id });
    return rows.length > 0;
  }
  async occurrences(options: BlockOccurrenceFilters) {
    validateOccurrenceRange(options);
    // Jump near the query interval; never enumerate an unbounded recurrence from its original start.
    const result = await this.db.execute<{ total: number; items: (Omit<BlockOccurrence, 'starts_at' | 'ends_at'> & { starts_at: string; ends_at: string })[] }>(sql`
      WITH source AS (
        SELECT *, starts_at AT TIME ZONE timezone AS local_start, ends_at AT TIME ZONE timezone AS local_end,
          CASE WHEN recurrence IS NULL THEN 1 ELSE (recurrence->>'interval')::int * CASE WHEN recurrence->>'frequency' = 'WEEKLY' THEN 7 ELSE 1 END END AS step_days
        FROM ${appScheduleBlocks} WHERE ${this.filters(options)}
      ), expanded AS (
        SELECT id AS block_id, unit_id, practitioner_id, room_id, reason, timezone, recurrence,
          CASE WHEN n = 0 THEN starts_at ELSE (local_start + make_interval(days => n * step_days)) AT TIME ZONE timezone END AS starts_at,
          CASE WHEN n = 0 THEN ends_at ELSE (local_end + make_interval(days => n * step_days)) AT TIME ZONE timezone END AS ends_at
        FROM source CROSS JOIN LATERAL generate_series(
          CASE WHEN recurrence IS NULL THEN 0 ELSE greatest(0, floor(extract(epoch FROM ((${options.from}::timestamptz AT TIME ZONE timezone) - local_start)) / 86400 / step_days)::int - 33) END,
          CASE WHEN recurrence IS NULL THEN 0 ELSE greatest(-1, floor(extract(epoch FROM ((${options.to}::timestamptz AT TIME ZONE timezone) - local_start)) / 86400 / step_days)::int + 1) END
        ) AS n
      ), matching AS (
        SELECT block_id, unit_id, practitioner_id, room_id, reason, timezone, starts_at, ends_at FROM expanded
        WHERE starts_at < ${options.to}::timestamptz AND ends_at > ${options.from}::timestamptz AND ends_at > starts_at
          AND (recurrence IS NULL OR recurrence->>'until' IS NULL OR starts_at <= (recurrence->>'until')::timestamptz)
      ), page AS (
        SELECT * FROM matching ORDER BY starts_at, block_id OFFSET ${options.offset} LIMIT ${options.limit}
      ) SELECT (SELECT count(*)::int FROM matching) AS total,
        coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY starts_at, block_id) FROM page), '[]'::jsonb) AS items
    `);
    const row = result[0];
    return { total: row.total, items: row.items.map(item => ({ ...item, starts_at: new Date(item.starts_at), ends_at: new Date(item.ends_at) })) };
  }
}

import { randomUUID } from 'node:crypto';
import { AppError, ErrorCode, ValidationError } from '@openclinic/core';
import { and, asc, count, eq, gt, isNull, lte, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { AvailabilityInput, AvailabilityListOptions, AvailabilityRepository, AvailabilityVersionInput } from '../../domain/availability.js';
import { validateAvailability } from '../../application/services/availability.service.js';
import { appAvailabilities, appOrganizationUnits, appPractitioners, appRooms } from './drizzle-schema.js';

type Transaction = Parameters<Parameters<PostgresJsDatabase['transaction']>[0]>[0];
const conflict = () => new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Only the latest non-deleted version can be changed', 409);

export class PostgresAvailabilityRepository implements AvailabilityRepository {
  constructor(private readonly db: PostgresJsDatabase, private readonly tenantId: string) {
    if (!tenantId) throw new Error('Availability repository requires a tenant');
  }
  private scope(id?: string, includeDeleted = false) {
    return and(eq(appAvailabilities.tenant_id, this.tenantId), includeDeleted ? undefined : isNull(appAvailabilities.deleted_at),
      id === undefined ? undefined : eq(appAvailabilities.id, id));
  }
  private async validateResource(tx: Transaction, input: AvailabilityInput) {
    const [unit] = await tx.select({ id: appOrganizationUnits.id }).from(appOrganizationUnits)
      .where(and(eq(appOrganizationUnits.tenant_id, this.tenantId), eq(appOrganizationUnits.id, input.unit_id),
        eq(appOrganizationUnits.is_active, true), isNull(appOrganizationUnits.deleted_at))).limit(1).for('share');
    if (!unit) throw new ValidationError('unit_id', 'Unit must be active in the current tenant');
    if (input.practitioner_id) {
      const [practitioner] = await tx.select({ id: appPractitioners.id }).from(appPractitioners)
        .where(and(eq(appPractitioners.tenant_id, this.tenantId), eq(appPractitioners.id, input.practitioner_id),
          eq(appPractitioners.is_active, true), isNull(appPractitioners.deleted_at))).limit(1).for('share');
      if (!practitioner) throw new ValidationError('practitioner_id', 'Practitioner must be active in the current tenant');
    } else {
      const [room] = await tx.select({ id: appRooms.id }).from(appRooms)
        .where(and(eq(appRooms.tenant_id, this.tenantId), eq(appRooms.id, input.room_id!), eq(appRooms.unit_id, input.unit_id),
          eq(appRooms.is_active, true), eq(appRooms.is_schedulable, true), isNull(appRooms.deleted_at))).limit(1).for('share');
      if (!room) throw new ValidationError('room_id', 'Room must be active, schedulable and belong to the selected unit');
    }
  }
  async list({ offset, limit, unit_id, practitioner_id, room_id, on_date }: AvailabilityListOptions) {
    const where = and(this.scope(),
      unit_id === undefined ? undefined : eq(appAvailabilities.unit_id, unit_id),
      practitioner_id === undefined ? undefined : eq(appAvailabilities.practitioner_id, practitioner_id),
      room_id === undefined ? undefined : eq(appAvailabilities.room_id, room_id),
      on_date === undefined ? undefined : and(lte(appAvailabilities.valid_from, on_date),
        or(isNull(appAvailabilities.valid_until), gt(appAvailabilities.valid_until, on_date)),
        eq(appAvailabilities.day_of_week, new Date(on_date).getUTCDay())));
    const items = await this.db.select().from(appAvailabilities).where(where)
      .orderBy(asc(appAvailabilities.valid_from), asc(appAvailabilities.day_of_week), asc(appAvailabilities.start_time), asc(appAvailabilities.id))
      .offset(offset).limit(limit);
    const [result] = await this.db.select({ total: count() }).from(appAvailabilities).where(where);
    return { items, total: result.total };
  }
  async getById(id: string) {
    const [row] = await this.db.select().from(appAvailabilities).where(this.scope(id)).limit(1);
    return row ?? null;
  }
  async history(id: string, { offset, limit }: { offset: number; limit: number }) {
    const [row] = await this.db.select().from(appAvailabilities).where(this.scope(id, true)).limit(1);
    if (!row) return null;
    const where = and(eq(appAvailabilities.tenant_id, this.tenantId), eq(appAvailabilities.series_id, row.series_id));
    const items = await this.db.select().from(appAvailabilities).where(where)
      .orderBy(asc(appAvailabilities.valid_from), asc(appAvailabilities.id)).offset(offset).limit(limit);
    const [result] = await this.db.select({ total: count() }).from(appAvailabilities).where(where);
    return { items, total: result.total };
  }
  async create(input: AvailabilityInput) {
    validateAvailability(input);
    return this.db.transaction(async tx => {
      await this.validateResource(tx, input);
      const id = randomUUID();
      const [row] = await tx.insert(appAvailabilities).values({ ...input, id, series_id: id, tenant_id: this.tenantId }).returning();
      return row;
    });
  }
  private async ensureLatest(tx: Transaction, id: string) {
    const [child] = await tx.select({ id: appAvailabilities.id }).from(appAvailabilities)
      .where(and(eq(appAvailabilities.tenant_id, this.tenantId), eq(appAvailabilities.replaces_id, id))).limit(1);
    if (child) throw conflict();
  }
  async version(id: string, input: AvailabilityVersionInput) {
    return this.db.transaction(async tx => {
      const [old] = await tx.select().from(appAvailabilities).where(this.scope(id)).limit(1).for('update');
      if (!old) return null;
      await this.ensureLatest(tx, id);
      if (input.valid_from <= old.valid_from || (old.valid_until != null && input.valid_from >= old.valid_until)) {
        throw new ValidationError('valid_from', 'New version must start strictly within the current validity period');
      }
      // Identity, resource and timezone remain stable for the entire series.
      const merged: AvailabilityInput = {
        unit_id: old.unit_id, practitioner_id: old.practitioner_id, room_id: old.room_id,
        day_of_week: input.day_of_week ?? old.day_of_week, start_time: input.start_time ?? old.start_time,
        end_time: input.end_time ?? old.end_time, slot_duration_minutes: input.slot_duration_minutes ?? old.slot_duration_minutes,
        timezone: old.timezone, valid_from: input.valid_from,
        valid_until: input.valid_until === undefined ? old.valid_until : input.valid_until,
        notes: input.notes === undefined ? old.notes : input.notes,
      };
      validateAvailability(merged);
      await this.validateResource(tx, merged);
      await tx.update(appAvailabilities).set({ valid_until: input.valid_from, updated_at: new Date() }).where(this.scope(id));
      const [row] = await tx.insert(appAvailabilities).values({ ...merged, id: randomUUID(), tenant_id: this.tenantId,
        series_id: old.series_id, replaces_id: id }).returning();
      return row;
    });
  }
  async softDelete(id: string) {
    return this.db.transaction(async tx => {
      const [row] = await tx.select({ id: appAvailabilities.id }).from(appAvailabilities).where(this.scope(id)).limit(1).for('update');
      if (!row) return false;
      await this.ensureLatest(tx, id);
      const now = new Date();
      await tx.update(appAvailabilities).set({ deleted_at: now, updated_at: now }).where(this.scope(id));
      return true;
    });
  }
}

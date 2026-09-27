import { randomUUID } from 'node:crypto';
import { AppError, ErrorCode, ValidationError } from '@openclinic/core';
import { and, asc, count, eq, ilike, isNull, isNotNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { RoomInput, RoomListOptions, RoomRepository } from '../../domain/room.js';
import { appAppointments, appAvailabilities, appOrganizationUnits, appRooms, appScheduleBlocks } from './drizzle-schema.js';

type Transaction = Parameters<Parameters<PostgresJsDatabase['transaction']>[0]>[0];

export class PostgresRoomRepository implements RoomRepository {
  constructor(private readonly db: PostgresJsDatabase, private readonly tenantId: string) {
    if (!tenantId) throw new Error('Room repository requires a tenant');
  }

  private scope(id?: string) {
    return and(eq(appRooms.tenant_id, this.tenantId), isNull(appRooms.deleted_at),
      id === undefined ? undefined : eq(appRooms.id, id));
  }

  private async validateUnit(tx: Transaction, unitId: string) {
    const [unit] = await tx.select({ id: appOrganizationUnits.id }).from(appOrganizationUnits)
      .where(and(eq(appOrganizationUnits.id, unitId), eq(appOrganizationUnits.tenant_id, this.tenantId),
        isNull(appOrganizationUnits.deleted_at), eq(appOrganizationUnits.is_active, true)))
      .limit(1).for('share');
    if (!unit) throw new ValidationError('unit_id', 'Unit must be active and belong to the current tenant');
  }

  async list({ offset, limit, unit_id, is_schedulable, is_active, q }: RoomListOptions) {
    const search = q === undefined ? undefined : `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const where = and(this.scope(),
      unit_id === undefined ? undefined : eq(appRooms.unit_id, unit_id),
      is_schedulable === undefined ? undefined : eq(appRooms.is_schedulable, is_schedulable),
      is_active === undefined ? undefined : eq(appRooms.is_active, is_active),
      search === undefined ? undefined : ilike(appRooms.name, search));
    const items = await this.db.select().from(appRooms).where(where)
      .orderBy(asc(appRooms.name), asc(appRooms.id)).offset(offset).limit(limit);
    const [result] = await this.db.select({ total: count() }).from(appRooms).where(where);
    return { items, total: result.total };
  }

  async getById(id: string) {
    const [room] = await this.db.select().from(appRooms).where(this.scope(id)).limit(1);
    return room ?? null;
  }

  async create(input: RoomInput) {
    return this.db.transaction(async tx => {
      await this.validateUnit(tx, input.unit_id);
      const [room] = await tx.insert(appRooms).values({ ...input, id: randomUUID(), tenant_id: this.tenantId }).returning();
      return room;
    });
  }

  async update(id: string, input: Partial<RoomInput>) {
    return this.db.transaction(async tx => {
      const [existing] = await tx.select({ id: appRooms.id, unit_id: appRooms.unit_id }).from(appRooms).where(this.scope(id)).limit(1).for('update');
      if (!existing) return null;
      if (input.unit_id !== undefined && input.unit_id !== existing.unit_id) {
        const [appointment] = await tx.select({ id: appAppointments.id }).from(appAppointments)
          .where(and(eq(appAppointments.tenant_id, this.tenantId), eq(appAppointments.room_id, id))).limit(1);
        if (appointment) throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Room unit cannot change after appointment history exists', 409);
        const [availability] = await tx.select({ id: appAvailabilities.id }).from(appAvailabilities)
          .where(and(eq(appAvailabilities.tenant_id, this.tenantId), eq(appAvailabilities.room_id, id))).limit(1);
        if (availability) throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Room unit cannot change after availability history exists', 409);
        const [block] = await tx.select({ id: appScheduleBlocks.id }).from(appScheduleBlocks)
          .where(and(eq(appScheduleBlocks.tenant_id, this.tenantId), eq(appScheduleBlocks.room_id, id), isNotNull(appScheduleBlocks.unit_id))).limit(1);
        if (block) throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Room unit cannot change while unit-scoped block records exist', 409);
      }
      if (input.unit_id !== undefined) await this.validateUnit(tx, input.unit_id);
      const [room] = await tx.update(appRooms).set({ ...input, updated_at: new Date() })
        .where(this.scope(id)).returning();
      return room;
    });
  }

  async softDelete(id: string) {
    const now = new Date();
    const rows = await this.db.update(appRooms).set({ is_active: false, deleted_at: now, updated_at: now })
      .where(this.scope(id)).returning({ id: appRooms.id });
    return rows.length > 0;
  }
}

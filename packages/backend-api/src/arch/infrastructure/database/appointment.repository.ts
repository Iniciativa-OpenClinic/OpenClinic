import { randomUUID } from 'node:crypto';
import { ValidationError } from '@openclinic/core';
import { and, asc, count, eq, isNull, ne, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { AppointmentFilters, AppointmentInput, AppointmentRepository, AppointmentStatus } from '../../domain/appointment.js';
import { appointmentConflict, validateAppointment, validateAppointmentFilters, validateAppointmentTransition } from '../../application/services/appointment.service.js';
import { appAppointments, appPatients, appPractitioners, appProcedures, appProcedurePractitioners, appOrganizationUnits, appRooms } from './drizzle-schema.js';
import { PostgresScheduleBlockRepository } from './schedule-block.repository.js';

type Transaction = Parameters<Parameters<PostgresJsDatabase['transaction']>[0]>[0];
export class PostgresAppointmentRepository implements AppointmentRepository {
  constructor(private readonly db: PostgresJsDatabase, private readonly tenantId: string) {
    if (!tenantId) throw new Error('Appointment repository requires a tenant');
  }
  private scope(id?: string) {
    return and(eq(appAppointments.tenant_id, this.tenantId), isNull(appAppointments.deleted_at),
      id === undefined ? undefined : eq(appAppointments.id, id));
  }
  // Serialize appointment writes within a tenant, including moves between resources.
  // A separate statement after acquiring the lock sees the preceding committed write.
  private async lock(tx: Transaction) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`appointments:${this.tenantId}`}, 0))`);
  }
  async list(options: AppointmentFilters) {
    validateAppointmentFilters(options);
    const where = and(this.scope(),
      ...(['patient_id', 'practitioner_id', 'unit_id', 'room_id', 'status'] as const).map(key => options[key] === undefined ? undefined : eq(appAppointments[key], options[key]!)),
      options.from ? sql`${appAppointments.appointment_date} + ${appAppointments.duration_minutes} * interval '1 minute' > ${options.from}::timestamptz` : undefined,
      options.to ? sql`${appAppointments.appointment_date} < ${options.to}::timestamptz` : undefined);
    const items = await this.db.select().from(appAppointments).where(where).orderBy(asc(appAppointments.appointment_date), asc(appAppointments.id)).offset(options.offset).limit(options.limit);
    const [result] = await this.db.select({ total: count() }).from(appAppointments).where(where);
    return { items, total: result.total };
  }
  async getById(id: string) {
    const [row] = await this.db.select().from(appAppointments).where(this.scope(id)).limit(1);
    return row ?? null;
  }
  private async validateResources(tx: Transaction, input: AppointmentInput) {
    const [unit] = await tx.select().from(appOrganizationUnits).where(and(eq(appOrganizationUnits.tenant_id, this.tenantId), eq(appOrganizationUnits.id, input.unit_id), eq(appOrganizationUnits.is_active, true), isNull(appOrganizationUnits.deleted_at))).limit(1).for('share');
    if (!unit) throw new ValidationError('unit_id');
    const [patient] = await tx.select().from(appPatients).where(and(eq(appPatients.tenant_id, this.tenantId), eq(appPatients.id, input.patient_id), eq(appPatients.is_active, true), isNull(appPatients.deleted_at))).limit(1).for('share');
    if (!patient) throw new ValidationError('patient_id');
    const [procedure] = await tx.select().from(appProcedures).where(and(eq(appProcedures.tenant_id, this.tenantId), eq(appProcedures.id, input.procedure_id), eq(appProcedures.is_active, true), isNull(appProcedures.deleted_at))).limit(1).for('share');
    if (!procedure) throw new ValidationError('procedure_id');
    const [practitioner] = await tx.select().from(appPractitioners).where(and(eq(appPractitioners.tenant_id, this.tenantId), eq(appPractitioners.id, input.practitioner_id), eq(appPractitioners.is_active, true), isNull(appPractitioners.deleted_at))).limit(1).for('share');
    if (!practitioner) throw new ValidationError('practitioner_id');
    const eligible = await tx.select().from(appProcedurePractitioners).where(and(eq(appProcedurePractitioners.tenant_id, this.tenantId), eq(appProcedurePractitioners.procedure_id, input.procedure_id)));
    if (eligible.length && !eligible.some(row => row.practitioner_id === input.practitioner_id)) throw new ValidationError('practitioner_id', 'Practitioner is not eligible for this procedure');
    if (procedure.requires_room && !input.room_id) throw new ValidationError('room_id', 'This procedure requires a room');
    if (input.room_id) {
      const [room] = await tx.select().from(appRooms).where(and(eq(appRooms.tenant_id, this.tenantId), eq(appRooms.id, input.room_id), eq(appRooms.unit_id, input.unit_id), eq(appRooms.is_active, true), eq(appRooms.is_schedulable, true), isNull(appRooms.deleted_at))).limit(1).for('share');
      if (!room) throw new ValidationError('room_id');
    }
    return procedure;
  }
  private async checkSchedule(tx: Transaction, input: AppointmentInput & { duration_minutes: number }, id?: string) {
    const from = new Date(input.appointment_date).toISOString();
    const to = new Date(Date.parse(from) + input.duration_minutes * 60000).toISOString();
    const [existing] = await tx.select({ id: appAppointments.id }).from(appAppointments).where(and(this.scope(),
      id ? ne(appAppointments.id, id) : undefined,
      eq(appAppointments.is_active, true), sql`${appAppointments.status} NOT IN ('CANCELLED', 'NO_SHOW')`,
      or(eq(appAppointments.practitioner_id, input.practitioner_id), input.room_id ? eq(appAppointments.room_id, input.room_id) : undefined),
      sql`${appAppointments.appointment_date} < ${to}::timestamptz AND ${appAppointments.appointment_date} + ${appAppointments.duration_minutes} * interval '1 minute' > ${from}::timestamptz`)).limit(1);
    if (existing) throw appointmentConflict('Practitioner or room already has an appointment in this period');
    const blocks = new PostgresScheduleBlockRepository(tx, this.tenantId);
    for (const resource of [{ practitioner_id: input.practitioner_id }, ...(input.room_id ? [{ room_id: input.room_id }] : [])]) {
      const blocked = await blocks.occurrences({ ...resource, unit_id: input.unit_id, from, to, offset: 0, limit: 1 });
      if (blocked.total) throw appointmentConflict('Appointment overlaps a resource block');
      if (!input.is_overbook) {
        const resourceColumn = 'practitioner_id' in resource ? sql`practitioner_id = ${resource.practitioner_id}` : sql`room_id = ${resource.room_id}`;
        // Union adjacent/overlapping windows, respecting each version's local date and timezone.
        const [coverage] = await tx.execute<{ covered: boolean }>(sql`
          WITH windows AS (
            SELECT (d::date + start_time::time) AT TIME ZONE timezone AS starts_at,
                   (d::date + end_time::time) AT TIME ZONE timezone AS ends_at
            FROM app_availabilities CROSS JOIN LATERAL generate_series(
              (${from}::timestamptz AT TIME ZONE timezone)::date::timestamp,
              (${to}::timestamptz AT TIME ZONE timezone)::date::timestamp, interval '1 day') d
            WHERE tenant_id = ${this.tenantId} AND unit_id = ${input.unit_id} AND ${resourceColumn}
              AND deleted_at IS NULL AND d::date >= valid_from AND (valid_until IS NULL OR d::date < valid_until)
              AND extract(dow FROM d) = day_of_week
          ) SELECT coalesce(range_agg(tstzrange(starts_at, ends_at, '[)')) @> tstzrange(${from}::timestamptz, ${to}::timestamptz, '[)'), false) AS covered
            FROM windows WHERE ends_at > starts_at`);
        if (!coverage.covered) throw appointmentConflict('Period is outside resource availability; explicitly mark is_overbook to allow a fit-in');
      }
    }
  }
  async create(input: AppointmentInput) {
    validateAppointment(input);
    return this.db.transaction(async tx => {
      await this.lock(tx);
      const procedure = await this.validateResources(tx, input);
      const complete = { ...input, duration_minutes: input.duration_minutes ?? procedure.estimated_duration_minutes };
      validateAppointment(complete);
      await this.checkSchedule(tx, complete);
      const [row] = await tx.insert(appAppointments).values({ ...complete, id: randomUUID(), tenant_id: this.tenantId,
        appointment_date: new Date(input.appointment_date), status: 'SCHEDULED', type: 'PROCEDURE' }).returning();
      return row;
    });
  }
  async update(id: string, input: Partial<AppointmentInput>) {
    return this.db.transaction(async tx => {
      await this.lock(tx);
      const [old] = await tx.select().from(appAppointments).where(this.scope(id)).limit(1).for('update');
      if (!old) return null;
      if (!['SCHEDULED', 'CONFIRMED'].includes(old.status)) throw appointmentConflict('Only scheduled or confirmed appointments may be edited');
      const merged = { ...old, ...input, appointment_date: input.appointment_date ?? old.appointment_date.toISOString() } as AppointmentInput;
      validateAppointment(merged);
      const procedure = await this.validateResources(tx, merged);
      const complete = { ...merged, duration_minutes: input.duration_minutes ?? (input.procedure_id && input.procedure_id !== old.procedure_id ? procedure.estimated_duration_minutes : old.duration_minutes) };
      validateAppointment(complete);
      await this.checkSchedule(tx, complete, id);
      const [row] = await tx.update(appAppointments).set({ ...input, duration_minutes: complete.duration_minutes,
        appointment_date: new Date(complete.appointment_date), updated_at: new Date() }).where(this.scope(id)).returning();
      return row;
    });
  }
  async changeStatus(id: string, status: AppointmentStatus) {
    return this.db.transaction(async tx => {
      await this.lock(tx);
      const [old] = await tx.select().from(appAppointments).where(this.scope(id)).limit(1).for('update');
      if (!old) return null;
      validateAppointmentTransition(old.status, status);
      if (old.status === status) return old;
      const [row] = await tx.update(appAppointments).set({ status, updated_at: new Date() }).where(this.scope(id)).returning();
      return row;
    });
  }
  async softDelete(id: string) {
    return this.db.transaction(async tx => {
      await this.lock(tx);
      const [old] = await tx.select().from(appAppointments).where(this.scope(id)).limit(1).for('update');
      if (!old) return false;
      if (!['SCHEDULED', 'CONFIRMED', 'CANCELLED'].includes(old.status)) throw appointmentConflict('An appointment that has arrived, started or finished cannot be deleted');
      const now = new Date();
      await tx.update(appAppointments).set({ status: 'CANCELLED', is_active: false, deleted_at: now, updated_at: now }).where(this.scope(id));
      return true;
    });
  }
}

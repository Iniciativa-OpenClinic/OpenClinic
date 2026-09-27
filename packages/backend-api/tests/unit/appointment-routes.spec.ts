import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerAppointmentRoutes } from '../../src/arch/presentation/appointment.router.js';
import { errorHandler } from '../../src/arch/presentation/error-handler.js';
import { appointmentConflict, validateAppointmentTransition } from '../../src/arch/application/services/appointment.service.js';
const input = { patient_id: 'patient', practitioner_id: 'professional', procedure_id: 'procedure', unit_id: 'unit', appointment_date: '2026-10-01T08:00:00Z', payer_type: 'PARTICULAR', source_channel: 'RECEPTION' };
const row = { ...input, id: 'a-1', tenant_id: 'tenant', appointment_date: new Date(input.appointment_date), duration_minutes: 30, status: 'SCHEDULED', is_overbook: false, is_active: true, created_at: new Date(), updated_at: new Date(), deleted_at: null };
const base = '/api/v1/business/appointments';
const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
function fixture() {
  const appointments = { list: vi.fn().mockResolvedValue({ items: [row], total: 1 }), getById: vi.fn().mockResolvedValue(row), create: vi.fn().mockResolvedValue(row), update: vi.fn().mockResolvedValue(row), changeStatus: vi.fn().mockResolvedValue(row), softDelete: vi.fn().mockResolvedValue(true) };
  const app = Fastify(); app.setErrorHandler(errorHandler); registerAppointmentRoutes(app, { appointments }); apps.push(app);
  return { app, appointments };
}
describe('Appointment HTTP component (mocked persistence)', () => {
  it.each([
    ['POST', '', { ...input, status: 'COMPLETED' }],
    ['POST', '', { ...input, session_id: 'unsupported-session' }],
    ['PUT', '/a-1', { tenant_id: 'another-tenant' }],
    ['PUT', '/a-1', { notes: 'valid', source_channel: 'PHONE' }],
    ['PATCH', '/a-1/status', { status: 'CONFIRMED', notes: 'silently discarded' }],
  ] as const)('rejects unsupported or immutable fields in %s %s', async (method, suffix, payload) => {
    const { app, appointments } = fixture();
    expect((await app.inject({ method, url: base + suffix, payload })).statusCode).toBe(400);
    expect(appointments.create).not.toHaveBeenCalled();
    expect(appointments.update).not.toHaveBeenCalled();
    expect(appointments.changeStatus).not.toHaveBeenCalled();
  });
  it('serializes the repository result and forwards creation fields', async () => {
    const { app, appointments } = fixture();
    const response = await app.inject({ method: 'POST', url: base, payload: input });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ duration_minutes: 30, status: 'SCHEDULED', appointment_date: '2026-10-01T08:00:00.000Z' });
    expect(appointments.create).toHaveBeenCalledWith(input);
  });
  it.each([{ duration_minutes: 0 }, { duration_minutes: 1441 }, { duration_minutes: 1.5 }, { appointment_date: '2026-10-01T08:00:00' }, { appointment_date: '2026-02-30T08:00:00Z' }, { patient_id: '' }, { unit_id: null }, { payer_type: 'PLAN' }, { source_channel: 'INVALID' }])('rejects invalid input %j', async patch => {
    const { app, appointments } = fixture();
    expect((await app.inject({ method: 'POST', url: base, payload: { ...input, ...patch } })).statusCode).toBe(400);
    expect(appointments.create).not.toHaveBeenCalled();
  });
  it('filters the daily queue by status and unit', async () => {
    const { app, appointments } = fixture();
    expect((await app.inject(base + '?status=ARRIVED&unit_id=u&from=2026-10-01T00:00:00Z&to=2026-10-02T00:00:00Z')).statusCode).toBe(200);
    expect(appointments.list).toHaveBeenCalledWith({ status: 'ARRIVED', unit_id: 'u', offset: 0, limit: 20, from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' });
  });
  it('rejects an inverted date filter', async () => {
    const { app, appointments } = fixture();
    expect((await app.inject(base + '?from=2026-10-02T00:00:00Z&to=2026-10-01T00:00:00Z')).statusCode).toBe(422);
    expect(appointments.list).not.toHaveBeenCalled();
  });
  it('forwards update fields including a null room', async () => {
    const { app, appointments } = fixture();
    expect((await app.inject({ method: 'PUT', url: base + '/a-1', payload: { room_id: null, is_overbook: true } })).statusCode).toBe(200);
    expect(appointments.update).toHaveBeenCalledWith('a-1', { room_id: null, is_overbook: true });
  });
  it('forwards the requested status to the repository', async () => {
    const { app, appointments } = fixture();
    expect((await app.inject({ method: 'PATCH', url: base + '/a-1/status', payload: { status: 'CONFIRMED' } })).statusCode).toBe(200);
    expect(appointments.changeStatus).toHaveBeenCalledWith('a-1', 'CONFIRMED');
  });
  it('returns conflicts without converting them to server errors', async () => {
    const { app, appointments } = fixture(); appointments.create.mockRejectedValue(appointmentConflict('Occupied'));
    expect((await app.inject({ method: 'POST', url: base, payload: input })).statusCode).toBe(409);
  });
  it.each(['GET', 'PUT', 'PATCH', 'DELETE'] as const)('returns 404 for absent %s targets', async method => {
    const { app, appointments } = fixture();
    appointments.getById.mockResolvedValue(null); appointments.update.mockResolvedValue(null); appointments.changeStatus.mockResolvedValue(null); appointments.softDelete.mockResolvedValue(false);
    expect((await app.inject({ method, url: base + '/missing' + (method === 'PATCH' ? '/status' : ''), ...(method === 'PUT' ? { payload: { notes: 'test' } } : method === 'PATCH' ? { payload: { status: 'CANCELLED' } } : {}) })).statusCode).toBe(404);
  });
  it('deletes with an empty response', async () => {
    const { app } = fixture(); const res = await app.inject({ method: 'DELETE', url: base + '/a-1' });
    expect(res.statusCode).toBe(204); expect(res.body).toBe('');
  });
  it('allows the lifecycle, idempotency and cancellation, and rejects reopening', () => {
    for (const [from, to] of [['SCHEDULED', 'CONFIRMED'], ['CONFIRMED', 'ARRIVED'], ['ARRIVED', 'IN_PROGRESS'], ['IN_PROGRESS', 'COMPLETED'], ['SCHEDULED', 'CANCELLED'], ['CONFIRMED', 'NO_SHOW']] as const) expect(() => validateAppointmentTransition(from, to)).not.toThrow();
    expect(() => validateAppointmentTransition('COMPLETED', 'COMPLETED')).not.toThrow();
    expect(() => validateAppointmentTransition('COMPLETED', 'SCHEDULED')).toThrow();
    expect(() => validateAppointmentTransition('SCHEDULED', 'COMPLETED')).toThrow();
    expect(() => validateAppointmentTransition('ARRIVED', 'NO_SHOW')).toThrow();
  });
});

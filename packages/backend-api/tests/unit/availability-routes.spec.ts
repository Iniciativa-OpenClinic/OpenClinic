import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { AppError } from '@openclinic/core';
import { registerAvailabilityRoutes } from '../../src/arch/presentation/availability.router.js';
import { errorHandler } from '../../src/arch/presentation/error-handler.js';

const input = { unit_id: 'unit-1', practitioner_id: 'professional-1', day_of_week: 1,
  start_time: '08:00', end_time: '12:00', slot_duration_minutes: 30, timezone: 'America/Fortaleza', valid_from: '2026-10-01' };
const row = { ...input, id: 'a-1', tenant_id: 'tenant-a', series_id: 'a-1', replaces_id: null,
  created_at: new Date('2026-01-01'), updated_at: new Date('2026-01-01'), deleted_at: null };
const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
const base = '/api/v1/business/availabilities';
function fixture() {
  const availabilities = {
    list: vi.fn().mockResolvedValue({ items: [row], total: 1 }), getById: vi.fn().mockResolvedValue(row),
    history: vi.fn().mockResolvedValue({ items: [row], total: 1 }), create: vi.fn().mockResolvedValue(row),
    version: vi.fn().mockResolvedValue({ ...row, id: 'a-2', replaces_id: 'a-1' }), softDelete: vi.fn().mockResolvedValue(true),
  };
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  registerAvailabilityRoutes(app, { availabilities });
  apps.push(app);
  return { app, availabilities };
}
describe('Availability endpoints', () => {
  it('creates a weekly window', async () => {
    const { app, availabilities } = fixture();
    const res = await app.inject({ method: 'POST', url: base, payload: input });
    expect(res.statusCode).toBe(201);
    expect(res.json().created_at).toBe(row.created_at.toISOString());
    expect(availabilities.create).toHaveBeenCalledWith(input);
  });
  it('accepts a room as the alternative resource', async () => {
    const { app } = fixture();
    expect((await app.inject({ method: 'POST', url: base, payload: { ...input, practitioner_id: null, room_id: 'room-1' } })).statusCode).toBe(201);
  });
  it.each([
    [{ day_of_week: null }, 400], [{ day_of_week: 7 }, 400], [{ start_time: '25:00' }, 400],
    [{ day_of_week: '1' }, 400], [{ slot_duration_minutes: 0 }, 400], [{ valid_from: '2026-02-30' }, 400],
    [{ start_time: '12:00' }, 422], [{ end_time: '07:00' }, 422], [{ slot_duration_minutes: 241 }, 422],
    [{ valid_until: '2026-10-01' }, 422], [{ valid_until: '2026-09-30' }, 422],
    [{ timezone: 'Not/AZone' }, 422], [{ practitioner_id: null }, 422], [{ room_id: 'room-1' }, 422],
  ])('rejects invalid window %j', async (changes, status) => {
    const { app, availabilities } = fixture();
    expect((await app.inject({ method: 'POST', url: base, payload: { ...input, ...changes } })).statusCode).toBe(status);
    expect(availabilities.create).not.toHaveBeenCalled();
  });
  it('passes resource, date and pagination filters', async () => {
    const { app, availabilities } = fixture();
    expect((await app.inject(base + '?unit_id=unit-1&on_date=2026-10-05&practitioner_id=professional-1')).statusCode).toBe(200);
    expect(availabilities.list).toHaveBeenCalledWith({ unit_id: 'unit-1', on_date: '2026-10-05', practitioner_id: 'professional-1', offset: 0, limit: 20 });
  });
  it.each(['limit=101', 'offset=-1', 'on_date=2026-02-30'])('rejects invalid query %s', async query => {
    const { app, availabilities } = fixture();
    expect((await app.inject(base + '?' + query)).statusCode).toBe(400);
    expect(availabilities.list).not.toHaveBeenCalled();
  });
  it('returns a new ID on versioning and strips identity changes', async () => {
    const { app, availabilities } = fixture();
    const res = await app.inject({ method: 'PUT', url: base + '/a-1', payload: { valid_from: '2026-11-01', start_time: '09:00', unit_id: 'forged', tenant_id: 'forged' } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: 'a-2', series_id: 'a-1', replaces_id: 'a-1' });
    expect(availabilities.version).toHaveBeenCalledWith('a-1', { valid_from: '2026-11-01', start_time: '09:00' });
  });
  it('requires a new validity start on update', async () => {
    const { app } = fixture();
    expect((await app.inject({ method: 'PUT', url: base + '/a-1', payload: { start_time: '09:00' } })).statusCode).toBe(400);
  });
  it('lists history with pagination', async () => {
    const { app, availabilities } = fixture();
    expect((await app.inject(base + '/a-1/history?limit=5')).statusCode).toBe(200);
    expect(availabilities.history).toHaveBeenCalledWith('a-1', { offset: 0, limit: 5 });
  });
  it.each(['GET', 'PUT', 'DELETE'] as const)('returns 404 for missing or foreign ID on %s', async method => {
    const { app, availabilities } = fixture();
    availabilities.getById.mockResolvedValue(null);
    availabilities.version.mockResolvedValue(null);
    availabilities.softDelete.mockResolvedValue(false);
    expect((await app.inject({ method, url: base + '/missing', ...(method === 'PUT' ? { payload: { valid_from: '2026-11-01' } } : {}) })).statusCode).toBe(404);
  });
  it('reports obsolete versions as conflicts', async () => {
    const { app, availabilities } = fixture();
    availabilities.version.mockRejectedValue(new AppError('ERR_BUSINESS_RULE_VIOLATION', 'Obsolete version', 409));
    expect((await app.inject({ method: 'PUT', url: base + '/a-1', payload: { valid_from: '2026-11-01' } })).statusCode).toBe(409);
  });
  it('soft deletes with an empty response', async () => {
    const { app } = fixture();
    const res = await app.inject({ method: 'DELETE', url: base + '/a-1' });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { ValidationError } from '@openclinic/core';
import { registerScheduleBlockRoutes } from '../../src/arch/presentation/schedule-block.router.js';
import { errorHandler } from '../../src/arch/presentation/error-handler.js';
const input = { practitioner_id: 'p-1', starts_at: '2026-10-01T08:00:00Z', ends_at: '2026-10-01T09:00:00Z', timezone: 'UTC' };
const row = { ...input, id: 'b-1', tenant_id: 'tenant-a', starts_at: new Date(input.starts_at), ends_at: new Date(input.ends_at),
  created_at: new Date('2026-01-01'), updated_at: new Date('2026-01-01'), deleted_at: null };
const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
const base = '/api/v1/business/blocks';
function fixture() {
  const scheduleBlocks = { list: vi.fn().mockResolvedValue({ items: [row], total: 1 }), getById: vi.fn().mockResolvedValue(row),
    create: vi.fn().mockResolvedValue(row), update: vi.fn().mockResolvedValue(row), softDelete: vi.fn().mockResolvedValue(true),
    occurrences: vi.fn().mockResolvedValue({ items: [{ block_id: row.id, starts_at: row.starts_at, ends_at: row.ends_at, timezone: 'UTC' }], total: 1 }) };
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  registerScheduleBlockRoutes(app, { scheduleBlocks });
  apps.push(app);
  return { app, scheduleBlocks };
}
describe('Schedule block endpoints', () => {
  it('creates a global practitioner block', async () => {
    const { app, scheduleBlocks } = fixture();
    const res = await app.inject({ method: 'POST', url: base, payload: input });
    expect(res.statusCode).toBe(201);
    expect(res.json().starts_at).toBe(row.starts_at.toISOString());
    expect(scheduleBlocks.create).toHaveBeenCalledWith(input);
  });
  it('accepts room, unit, reason and weekly recurrence', async () => {
    const { app, scheduleBlocks } = fixture();
    const payload = { ...input, practitioner_id: null, room_id: 'r-1', unit_id: 'u-1', reason: 'Maintenance', recurrence: { frequency: 'WEEKLY', interval: 2, until: null } };
    expect((await app.inject({ method: 'POST', url: base, payload })).statusCode).toBe(201);
    expect(scheduleBlocks.create).toHaveBeenCalledWith(payload);
  });
  it.each([
    [{ starts_at: '2026-02-30T08:00:00Z' }, 400], [{ starts_at: '2026-10-01T08:00:00' }, 400],
    [{ ends_at: input.starts_at }, 422], [{ ends_at: '2026-09-30T08:00:00Z' }, 422],
    [{ timezone: 'Not/AZone' }, 422], [{ practitioner_id: null }, 422], [{ room_id: 'r-1' }, 422],
    [{ recurrence: {} }, 400], [{ recurrence: { frequency: 'MONTHLY', interval: 1 } }, 400],
    [{ recurrence: { frequency: 'DAILY', interval: 0 } }, 400], [{ recurrence: { frequency: 'DAILY', interval: 53 } }, 400],
    [{ recurrence: { frequency: 'DAILY', interval: 1.5 } }, 400],
    [{ recurrence: { frequency: 'DAILY', interval: 1, until: '2026-09-01T00:00:00Z' } }, 422],
  ])('rejects invalid block %j', async (changes, status) => {
    const { app, scheduleBlocks } = fixture();
    expect((await app.inject({ method: 'POST', url: base, payload: { ...input, ...changes } })).statusCode).toBe(status);
    expect(scheduleBlocks.create).not.toHaveBeenCalled();
  });
  it('passes list filters and pagination', async () => {
    const { app, scheduleBlocks } = fixture();
    expect((await app.inject(base + '?unit_id=u-1&practitioner_id=p-1')).statusCode).toBe(200);
    expect(scheduleBlocks.list).toHaveBeenCalledWith({ unit_id: 'u-1', practitioner_id: 'p-1', offset: 0, limit: 20 });
  });
  it('returns occurrences with resource filters', async () => {
    const { app, scheduleBlocks } = fixture();
    const res = await app.inject(base + '/occurrences?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z&room_id=r-1');
    expect(res.statusCode).toBe(200);
    expect(res.json().items[0].block_id).toBe('b-1');
    expect(scheduleBlocks.occurrences).toHaveBeenCalledWith({ from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00Z', room_id: 'r-1', offset: 0, limit: 20 });
  });
  it.each([
    ['from=2026-01-01T00:00:00Z', 400],
    ['from=2026-01-02T00:00:00Z&to=2026-01-01T00:00:00Z', 422],
    ['from=2026-01-01T00:00:00Z&to=2028-01-01T00:00:00Z', 422],
    ['from=2026-01-01T00:00:00Z&to=2026-02-01T00:00:00Z&limit=101', 400],
  ])('rejects invalid occurrence query %s', async (query, status) => {
    const { app, scheduleBlocks } = fixture();
    expect((await app.inject(base + '/occurrences?' + query)).statusCode).toBe(status);
    expect(scheduleBlocks.occurrences).not.toHaveBeenCalled();
  });
  it('updates supplied fields and permits clearing optional values', async () => {
    const { app, scheduleBlocks } = fixture();
    const payload = { unit_id: null, reason: null, recurrence: null };
    expect((await app.inject({ method: 'PUT', url: base + '/b-1', payload })).statusCode).toBe(200);
    expect(scheduleBlocks.update).toHaveBeenCalledWith('b-1', payload);
  });
  it('rejects invalid merged periods before returning success', async () => {
    const { app, scheduleBlocks } = fixture();
    scheduleBlocks.update.mockRejectedValue(new ValidationError('period'));
    expect((await app.inject({ method: 'PUT', url: base + '/b-1', payload: { ends_at: '2020-01-01T00:00:00Z' } })).statusCode).toBe(422);
  });
  it.each(['GET', 'PUT', 'DELETE'] as const)('returns 404 for absent or foreign ID on %s', async method => {
    const { app, scheduleBlocks } = fixture();
    scheduleBlocks.getById.mockResolvedValue(null); scheduleBlocks.update.mockResolvedValue(null); scheduleBlocks.softDelete.mockResolvedValue(false);
    expect((await app.inject({ method, url: base + '/missing', ...(method === 'PUT' ? { payload: { reason: 'Changed' } } : {}) })).statusCode).toBe(404);
  });
  it('soft deletes with an empty body', async () => {
    const { app } = fixture();
    const res = await app.inject({ method: 'DELETE', url: base + '/b-1' });
    expect(res.statusCode).toBe(204); expect(res.body).toBe('');
  });
  it('ignores client-supplied IDs, tenant and timestamps', async () => {
    const { app, scheduleBlocks } = fixture();
    expect((await app.inject({ method: 'POST', url: base, payload: { ...input, id: 'forged', tenant_id: 'other', deleted_at: '2026-01-01' } })).statusCode).toBe(201);
    expect(scheduleBlocks.create).toHaveBeenCalledWith(input);
  });
});

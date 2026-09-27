import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { ValidationError } from '@openclinic/core';
import { registerRoomRoutes } from '../../src/arch/presentation/room.router.js';
import { errorHandler } from '../../src/arch/presentation/error-handler.js';

const payload = { name: 'Sala 1', unit_id: 'unit-1', is_schedulable: true };
const room = { ...payload, id: 'room-1', tenant_id: 'tenant-a', equipment: [], is_active: true,
  created_at: new Date('2026-01-01'), updated_at: new Date('2026-01-01'), deleted_at: null };
const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

function fixture() {
  const rooms = {
    list: vi.fn().mockResolvedValue({ items: [room], total: 1 }),
    getById: vi.fn().mockResolvedValue(room),
    create: vi.fn().mockResolvedValue(room),
    update: vi.fn().mockResolvedValue(room),
    softDelete: vi.fn().mockResolvedValue(true),
  };
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  registerRoomRoutes(app, { rooms });
  apps.push(app);
  return { app, rooms };
}
const base = '/api/v1/business/rooms';

describe('Room REST endpoints', () => {
  it('creates a room and serializes timestamps', async () => {
    const { app, rooms } = fixture();
    const response = await app.inject({ method: 'POST', url: base, payload });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ ...room, created_at: room.created_at.toISOString(), updated_at: room.updated_at.toISOString() });
    expect(rooms.create).toHaveBeenCalledWith(payload);
  });

  it('accepts all documented fields', async () => {
    const { app, rooms } = fixture();
    const input = { ...payload, room_type: 'consultorio', equipment: ['Maca', 'Ultrassom'], notes: 'Primeiro andar', is_active: true };
    expect((await app.inject({ method: 'POST', url: base, payload: input })).statusCode).toBe(201);
    expect(rooms.create).toHaveBeenCalledWith(input);
  });

  it('lists with default pagination', async () => {
    const { app, rooms } = fixture();
    const response = await app.inject(base);
    expect(response.statusCode).toBe(200);
    expect(response.json().total).toBe(1);
    expect(rooms.list).toHaveBeenCalledWith({ offset: 0, limit: 20 });
  });

  it('passes unit, search, activity and schedulability filters', async () => {
    const { app, rooms } = fixture();
    expect((await app.inject(`${base}?unit_id=unit-1&q=Sala&offset=2&limit=5&is_active=false&is_schedulable=false`)).statusCode).toBe(200);
    expect(rooms.list).toHaveBeenCalledWith({ unit_id: 'unit-1', q: 'Sala', offset: 2, limit: 5, is_active: false, is_schedulable: false });
  });

  it.each(['offset=-1', 'limit=0', 'limit=101', 'limit=x', 'is_active=invalid', 'is_schedulable=invalid', 'unit_id=%20', 'q=%20'])('rejects invalid query %s', async query => {
    const { app, rooms } = fixture();
    expect((await app.inject(`${base}?${query}`)).statusCode).toBe(400);
    expect(rooms.list).not.toHaveBeenCalled();
  });

  it('gets a room by ID', async () => {
    const { app, rooms } = fixture();
    expect((await app.inject(`${base}/room-1`)).statusCode).toBe(200);
    expect(rooms.getById).toHaveBeenCalledWith('room-1');
  });

  it.each(['name', 'unit_id', 'is_schedulable'])('requires %s on creation', async key => {
    const { app, rooms } = fixture();
    const input: Record<string, unknown> = { ...payload };
    delete input[key];
    expect((await app.inject({ method: 'POST', url: base, payload: input })).statusCode).toBe(400);
    expect(rooms.create).not.toHaveBeenCalled();
  });

  it.each([{}, { name: ' ' }, { name: 'a'.repeat(256) }, { unit_id: '' }, { unit_id: null },
    { unit_id: 'a'.repeat(37) }, { is_schedulable: null }, { is_schedulable: 'false' }, { is_active: 0 },
    { is_active: null }, { room_type: 'a'.repeat(101) }, { notes: 'a'.repeat(10001) },
    { equipment: null }, { equipment: [' '] }, { equipment: ['Maca', 'Maca'] },
    { equipment: ['a'.repeat(256)] }, { equipment: Array.from({ length: 101 }, (_, i) => `Item ${i}`) }])('rejects invalid update %#', async input => {
    const { app, rooms } = fixture();
    expect((await app.inject({ method: 'PUT', url: `${base}/room-1`, payload: input })).statusCode).toBe(400);
    expect(rooms.update).not.toHaveBeenCalled();
  });

  it('preserves omitted fields, clears optional data and supports deactivation', async () => {
    const { app, rooms } = fixture();
    const input = { is_active: false, is_schedulable: false, room_type: null, notes: null, equipment: [] };
    expect((await app.inject({ method: 'PUT', url: `${base}/room-1`, payload: input })).statusCode).toBe(200);
    expect(rooms.update).toHaveBeenCalledWith('room-1', input);
  });

  it.each(['POST', 'PUT'] as const)('returns 422 for missing, inactive or foreign unit on %s', async method => {
    const { app, rooms } = fixture();
    rooms.create.mockRejectedValue(new ValidationError('unit_id'));
    rooms.update.mockRejectedValue(new ValidationError('unit_id'));
    expect((await app.inject({ method, url: base + (method === 'PUT' ? '/room-1' : ''), payload })).statusCode).toBe(422);
  });

  it.each(['GET', 'PUT', 'DELETE'] as const)('returns 404 for absent, deleted or foreign room on %s', async method => {
    const { app, rooms } = fixture();
    rooms.getById.mockResolvedValue(null);
    rooms.update.mockResolvedValue(null);
    rooms.softDelete.mockResolvedValue(false);
    expect((await app.inject({ method, url: `${base}/missing`, ...(method === 'PUT' ? { payload: { name: 'New' } } : {}) })).statusCode).toBe(404);
  });

  it('soft deletes and returns an empty 204', async () => {
    const { app, rooms } = fixture();
    const response = await app.inject({ method: 'DELETE', url: `${base}/room-1` });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(rooms.softDelete).toHaveBeenCalledWith('room-1');
  });

  it('does not forward server-controlled identity, tenant or timestamps', async () => {
    const { app, rooms } = fixture();
    const input = { ...payload, id: 'forged', tenant_id: 'foreign', deleted_at: '2026-01-01' };
    expect((await app.inject({ method: 'POST', url: base, payload: input })).statusCode).toBe(201);
    expect(rooms.create).toHaveBeenCalledWith(payload);
  });
});

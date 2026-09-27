import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { ValidationError } from '@openclinic/core';
import { registerProcedureRoutes } from '../../src/arch/presentation/procedure.router.js';
import { errorHandler } from '../../src/arch/presentation/error-handler.js';

const payload = { name: 'Consulta', estimated_duration_minutes: 30, requires_room: true };
const procedure = { ...payload, id: 'procedure-1', tenant_id: 'tenant-a', is_active: true, practitioner_ids: [],
  created_at: new Date('2026-01-01'), updated_at: new Date('2026-01-01'), deleted_at: null };
const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

function fixture() {
  const procedures = {
    list: vi.fn().mockResolvedValue({ items: [procedure], total: 1 }),
    getById: vi.fn().mockResolvedValue(procedure),
    create: vi.fn().mockResolvedValue(procedure),
    update: vi.fn().mockResolvedValue(procedure),
    softDelete: vi.fn().mockResolvedValue(true),
  };
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  registerProcedureRoutes(app, { procedures });
  apps.push(app);
  return { app, procedures };
}
const base = '/api/v1/business/procedures';

describe('Procedure REST endpoints', () => {
  it('creates the catalog item and serializes timestamps', async () => {
    const { app, procedures } = fixture();
    const response = await app.inject({ method: 'POST', url: base, payload });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ ...procedure, created_at: procedure.created_at.toISOString(), updated_at: procedure.updated_at.toISOString() });
    expect(procedures.create).toHaveBeenCalledWith(payload);
  });

  it('lists with default pagination', async () => {
    const { app, procedures } = fixture();
    const response = await app.inject(base);
    expect(response.statusCode).toBe(200);
    expect(response.json().total).toBe(1);
    expect(procedures.list).toHaveBeenCalledWith({ offset: 0, limit: 20 });
  });

  it('passes search, pagination and inactive filter without losing false', async () => {
    const { app, procedures } = fixture();
    expect((await app.inject(`${base}?q=Consulta&offset=2&limit=5&is_active=false`)).statusCode).toBe(200);
    expect(procedures.list).toHaveBeenCalledWith({ q: 'Consulta', offset: 2, limit: 5, is_active: false });
  });

  it.each(['offset=-1', 'limit=0', 'limit=101', 'limit=x', 'is_active=invalid', 'q=%20'])('rejects invalid query %s', async query => {
    const { app, procedures } = fixture();
    expect((await app.inject(`${base}?${query}`)).statusCode).toBe(400);
    expect(procedures.list).not.toHaveBeenCalled();
  });

  it('gets a procedure by ID', async () => {
    const { app, procedures } = fixture();
    const response = await app.inject(`${base}/procedure-1`);
    expect(response.statusCode).toBe(200);
    expect(procedures.getById).toHaveBeenCalledWith('procedure-1');
  });

  it.each(['name', 'estimated_duration_minutes', 'requires_room'])('requires %s on creation', async key => {
    const { app, procedures } = fixture();
    const input: Record<string, unknown> = { ...payload };
    delete input[key];
    expect((await app.inject({ method: 'POST', url: base, payload: input })).statusCode).toBe(400);
    expect(procedures.create).not.toHaveBeenCalled();
  });

  it.each([{}, { name: ' ' }, { name: 'a'.repeat(256) }, { estimated_duration_minutes: 0 },
    { estimated_duration_minutes: 1.5 }, { estimated_duration_minutes: null }, { estimated_duration_minutes: 2147483648 },
    { requires_room: null }, { requires_room: 'false' }, { is_active: 0 }, { return_after_days: -1 }, { minimum_interval_days: -1 },
    { tuss_code: '123' }, { calendar_color: 'red' }, { practitioner_ids: ['a', 'a'] },
    { practitioner_ids: [null] }, { practitioner_ids: null }, { is_active: null }])('rejects invalid update %j', async input => {
    const { app, procedures } = fixture();
    expect((await app.inject({ method: 'PUT', url: `${base}/procedure-1`, payload: input })).statusCode).toBe(400);
    expect(procedures.update).not.toHaveBeenCalled();
  });

  it('supports partial updates, deactivation and clearing optional fields and relationships', async () => {
    const { app, procedures } = fixture();
    const input = { is_active: false, description: null, tuss_code: null, return_after_days: null, practitioner_ids: [] };
    expect((await app.inject({ method: 'PUT', url: `${base}/procedure-1`, payload: input })).statusCode).toBe(200);
    expect(procedures.update).toHaveBeenCalledWith('procedure-1', input);
  });

  it('accepts the complete catalog payload', async () => {
    const { app, procedures } = fixture();
    const input = { ...payload, description: 'Atendimento', category: 'consulta', tuss_code: '10101012',
      preparation_instructions: 'Trazer exames', return_after_days: 30, minimum_interval_days: 0,
      calendar_color: '#00aAFF', practitioner_ids: ['professional-1'], is_active: true };
    expect((await app.inject({ method: 'POST', url: base, payload: input })).statusCode).toBe(201);
    expect(procedures.create).toHaveBeenCalledWith(input);
  });

  it.each(['POST', 'PUT'] as const)('returns 422 on invalid practitioner references on %s', async method => {
    const { app, procedures } = fixture();
    procedures.create.mockRejectedValue(new ValidationError('practitioner_ids'));
    procedures.update.mockRejectedValue(new ValidationError('practitioner_ids'));
    expect((await app.inject({ method, url: base + (method === 'PUT' ? '/procedure-1' : ''), payload: { ...payload, practitioner_ids: ['foreign'] } })).statusCode).toBe(422);
  });

  it.each(['GET', 'PUT', 'DELETE'] as const)('returns 404 for absent, deleted or foreign procedure on %s', async method => {
    const { app, procedures } = fixture();
    procedures.getById.mockResolvedValue(null);
    procedures.update.mockResolvedValue(null);
    procedures.softDelete.mockResolvedValue(false);
    expect((await app.inject({ method, url: `${base}/missing`, ...(method === 'PUT' ? { payload: { name: 'New' } } : {}) })).statusCode).toBe(404);
  });

  it('soft deletes and returns an empty 204', async () => {
    const { app, procedures } = fixture();
    const response = await app.inject({ method: 'DELETE', url: `${base}/procedure-1` });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(procedures.softDelete).toHaveBeenCalledWith('procedure-1');
  });

  it('does not forward identity, tenant, timestamps or prices to persistence', async () => {
    const { app, procedures } = fixture();
    const input = { ...payload, id: 'forged', tenant_id: 'foreign', deleted_at: '2026-01-01', base_price_cents: 100 };
    expect((await app.inject({ method: 'POST', url: base, payload: input })).statusCode).toBe(201);
    expect(procedures.create).toHaveBeenCalledWith(payload);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerUnitRoutes } from '../../src/arch/presentation/unit.router.js';
import { errorHandler } from '../../src/arch/presentation/error-handler.js';

type Unit = {
  id: string;
  tenant_id: string;
  name: string;
  organization_id: string;
  is_headquarters: boolean;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

const unit: Unit = {
  id: 'unit-1',
  tenant_id: 'tenant-1',
  name: 'Maria da Silva',
  organization_id: 'organization-1',
  is_headquarters: true,
  cnpj: '11222333000181',
  email: 'maria@example.com',
  phone: '+5511999999999',
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  deleted_at: null,
};

const createPayload = {
  name: 'Maria da Silva',
  organization_id: 'organization-1',
  is_headquarters: true,
  cnpj: '11222333000181',
  email: 'maria@example.com',
  phone: '+5511999999999',
};

const unitJson = {
  ...unit,
  created_at: unit.created_at.toISOString(),
  updated_at: unit.updated_at.toISOString(),
};
const apps: ReturnType<typeof Fastify>[] = [];

function fixture() {
  const units = {
    organizationExists: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue({ items: [unit], total: 1 }),
    getById: vi.fn().mockResolvedValue(unit),
    create: vi.fn().mockResolvedValue(unit),
    update: vi.fn().mockResolvedValue({ ...unit, name: 'Maria Souza' }),
    softDelete: vi.fn().mockResolvedValue(undefined),
  };
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  apps.push(app);

  registerUnitRoutes(app, { units });

  return { app, units };
}

describe('Unit REST endpoints', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(() => {
    app = fixture().app;
  });

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((instance) => instance.close()));
  });

  it('lists units with pagination metadata', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/business/units' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [unitJson], total: 1 });
  });

  it('creates a unit', async () => {
    const fixtureResult = fixture();
    app = fixtureResult.app;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/business/units',
      payload: createPayload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(unitJson);
    expect(fixtureResult.units.create).toHaveBeenCalledWith(createPayload);
  });

  it('rejects a unit without a name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/business/units',
      payload: { ...createPayload, name: '' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('gets a unit by id', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/business/units/unit-1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(unitJson);
  });

  it('updates a unit', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/business/units/unit-1',
      payload: { name: 'Maria Souza' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'unit-1', name: 'Maria Souza' });
  });

  it('soft-deletes a unit', async () => {
    const { app: deleteApp, units } = fixture();

    const response = await deleteApp.inject({
      method: 'DELETE',
      url: '/api/v1/business/units/unit-1',
    });

    expect(response.statusCode).toBe(204);
    expect(units.softDelete).toHaveBeenCalledWith('unit-1');
  });

  it('passes pagination to the repository', async () => {
    const { app, units } = fixture();
    const response = await app.inject({ method: 'GET', url: '/api/v1/business/units?offset=20&limit=10' });
    expect(response.statusCode).toBe(200);
    expect(units.list).toHaveBeenCalledWith({ offset: 20, limit: 10 });
  });

  it.each(['offset=-1', 'limit=0', 'limit=101', 'limit=abc'])('rejects invalid pagination: %s', async (query) => {
    const { app, units } = fixture();
    const response = await app.inject({ method: 'GET', url: `/api/v1/business/units?${query}` });
    expect(response.statusCode).toBe(400);
    expect(units.list).not.toHaveBeenCalled();
  });

  it.each(['GET', 'PUT', 'DELETE'] as const)('returns 404 for a missing unit on %s', async (method) => {
    const { app, units } = fixture();
    units.getById.mockResolvedValue(null);
    units.update.mockResolvedValue(null);
    const response = await app.inject({
      method,
      url: '/api/v1/business/units/missing',
      ...(method === 'PUT' ? { payload: { name: 'Maria Souza' } } : {}),
    });
    expect(response.statusCode).toBe(404);
    expect(units.softDelete).not.toHaveBeenCalled();
  });

  it.each([{}, { name: '   ' }, { email: 'invalid' }, { cnpj: '11111111111111' },
    { cnpj: '123' }, { email: 'XX' }, { organization_id: '   ' },
    { organization_id: null }, { phone: '1'.repeat(21) }])('rejects invalid updates: %j', async (payload) => {
    const { app, units } = fixture();
    const response = await app.inject({ method: 'PUT', url: '/api/v1/business/units/unit-1', payload });
    expect(response.statusCode).toBe('cnpj' in payload && payload.cnpj === '11111111111111' ? 422 : 400);
    expect(units.update).not.toHaveBeenCalled();
  });

  it('requires an organization on creation', async () => {
    const { app, units } = fixture();
    const response = await app.inject({ method: 'POST', url: '/api/v1/business/units', payload: { name: 'Maria' } });
    expect(response.statusCode).toBe(400);
    expect(units.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid CNPJ on creation before persistence', async () => {
    const { app, units } = fixture();
    const response = await app.inject({ method: 'POST', url: '/api/v1/business/units', payload: { ...createPayload, cnpj: '11111111111111' } });
    expect(response.statusCode).toBe(422);
    expect(units.create).not.toHaveBeenCalled();
  });

  it('does not forward server-controlled fields to persistence', async () => {
    const { app, units } = fixture();
    const response = await app.inject({ method: 'POST', url: '/api/v1/business/units',
      payload: { ...createPayload, tenant_id: 'other-tenant', user_id: 'other-user', is_active: false } });
    expect(response.statusCode).toBe(201);
    expect(units.create).toHaveBeenCalledWith(createPayload);
  });
  it.each(['POST', 'PUT'] as const)('rejects organizations outside the tenant on %s', async (method) => {
    const { app, units } = fixture();
    units.organizationExists.mockResolvedValue(false);
    const response = await app.inject({ method, url: '/api/v1/business/units' + (method === 'PUT' ? '/unit-1' : ''), payload: createPayload });
    expect(response.statusCode).toBe(422);
    expect(units.create).not.toHaveBeenCalled();
    expect(units.update).not.toHaveBeenCalled();
  });

  it('preserves omitted fields and permits clearing optional values', async () => {
    const { app, units } = fixture();
    const response = await app.inject({ method: 'PUT', url: '/api/v1/business/units/unit-1', payload: { cnpj: null, email: null } });
    expect(response.statusCode).toBe(200);
    expect(units.update).toHaveBeenCalledWith('unit-1', { cnpj: null, email: null });
    expect(units.organizationExists).not.toHaveBeenCalled();
  });
});

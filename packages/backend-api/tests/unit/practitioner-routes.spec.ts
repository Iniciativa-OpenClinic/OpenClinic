import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerPractitionerRoutes } from '../../src/arch/presentation/practitioner.router.js';
import { errorHandler } from '../../src/arch/presentation/error-handler.js';

type Practitioner = {
  id: string;
  tenant_id: string;
  full_name: string;
  practitioner_type: string;
  is_clinical_staff: boolean;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

const practitioner: Practitioner = {
  id: 'practitioner-1',
  tenant_id: 'tenant-1',
  full_name: 'Maria da Silva',
  practitioner_type: 'PHYSICIAN',
  is_clinical_staff: true,
  cpf: '12345678909',
  email: 'maria@example.com',
  phone: '+5511999999999',
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  deleted_at: null,
};

const createPayload = {
  full_name: 'Maria da Silva',
  practitioner_type: 'PHYSICIAN',
  is_clinical_staff: true,
  cpf: '12345678909',
  email: 'maria@example.com',
  phone: '+5511999999999',
};

const practitionerJson = {
  ...practitioner,
  created_at: practitioner.created_at.toISOString(),
  updated_at: practitioner.updated_at.toISOString(),
};
const apps: ReturnType<typeof Fastify>[] = [];

function fixture() {
  const practitioners = {
    list: vi.fn().mockResolvedValue({ items: [practitioner], total: 1 }),
    getById: vi.fn().mockResolvedValue(practitioner),
    create: vi.fn().mockResolvedValue(practitioner),
    update: vi.fn().mockResolvedValue({ ...practitioner, full_name: 'Maria Souza' }),
    softDelete: vi.fn().mockResolvedValue(undefined),
  };
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  apps.push(app);

  registerPractitionerRoutes(app, { practitioners });

  return { app, practitioners };
}

describe('Practitioner REST endpoints', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(() => {
    app = fixture().app;
  });

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((instance) => instance.close()));
  });

  it('lists practitioners with pagination metadata', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/business/practitioners' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [practitionerJson], total: 1 });
  });

  it('creates a practitioner', async () => {
    const fixtureResult = fixture();
    app = fixtureResult.app;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/business/practitioners',
      payload: createPayload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(practitionerJson);
    expect(fixtureResult.practitioners.create).toHaveBeenCalledWith(createPayload);
  });

  it('rejects a practitioner without a full name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/business/practitioners',
      payload: { ...createPayload, full_name: '' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('gets a practitioner by id', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/business/practitioners/practitioner-1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(practitionerJson);
  });

  it('updates a practitioner', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/business/practitioners/practitioner-1',
      payload: { full_name: 'Maria Souza' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'practitioner-1', full_name: 'Maria Souza' });
  });

  it('soft-deletes a practitioner', async () => {
    const { app: deleteApp, practitioners } = fixture();

    const response = await deleteApp.inject({
      method: 'DELETE',
      url: '/api/v1/business/practitioners/practitioner-1',
    });

    expect(response.statusCode).toBe(204);
    expect(practitioners.softDelete).toHaveBeenCalledWith('practitioner-1');
  });

  it('passes pagination to the repository', async () => {
    const { app, practitioners } = fixture();
    const response = await app.inject({ method: 'GET', url: '/api/v1/business/practitioners?offset=20&limit=10' });
    expect(response.statusCode).toBe(200);
    expect(practitioners.list).toHaveBeenCalledWith({ offset: 20, limit: 10 });
  });

  it.each(['offset=-1', 'limit=0', 'limit=101', 'limit=abc'])('rejects invalid pagination: %s', async (query) => {
    const { app, practitioners } = fixture();
    const response = await app.inject({ method: 'GET', url: `/api/v1/business/practitioners?${query}` });
    expect(response.statusCode).toBe(400);
    expect(practitioners.list).not.toHaveBeenCalled();
  });

  it.each(['GET', 'PUT', 'DELETE'] as const)('returns 404 for a missing practitioner on %s', async (method) => {
    const { app, practitioners } = fixture();
    practitioners.getById.mockResolvedValue(null);
    practitioners.update.mockResolvedValue(null);
    const response = await app.inject({
      method,
      url: '/api/v1/business/practitioners/missing',
      ...(method === 'PUT' ? { payload: { full_name: 'Maria Souza' } } : {}),
    });
    expect(response.statusCode).toBe(404);
    expect(practitioners.softDelete).not.toHaveBeenCalled();
  });

  it.each([{}, { full_name: '   ' }, { email: 'invalid' }, { cpf: '11111111111' },
    { cpf: '123' }, { council_uf: 'XX' }, { practitioner_type: '   ' },
    { practitioner_type: null }, { council_number: '1'.repeat(21) }])('rejects invalid updates: %j', async (payload) => {
    const { app, practitioners } = fixture();
    const response = await app.inject({ method: 'PUT', url: '/api/v1/business/practitioners/practitioner-1', payload });
    expect(response.statusCode).toBe('cpf' in payload && payload.cpf === '11111111111' ? 422 : 400);
    expect(practitioners.update).not.toHaveBeenCalled();
  });

  it('requires a practitioner type on creation', async () => {
    const { app, practitioners } = fixture();
    const response = await app.inject({ method: 'POST', url: '/api/v1/business/practitioners', payload: { full_name: 'Maria' } });
    expect(response.statusCode).toBe(400);
    expect(practitioners.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid CPF on creation before persistence', async () => {
    const { app, practitioners } = fixture();
    const response = await app.inject({ method: 'POST', url: '/api/v1/business/practitioners', payload: { ...createPayload, cpf: '11111111111' } });
    expect(response.statusCode).toBe(422);
    expect(practitioners.create).not.toHaveBeenCalled();
  });

  it('does not forward server-controlled fields to persistence', async () => {
    const { app, practitioners } = fixture();
    const response = await app.inject({ method: 'POST', url: '/api/v1/business/practitioners',
      payload: { ...createPayload, tenant_id: 'other-tenant', user_id: 'other-user', is_active: false } });
    expect(response.statusCode).toBe(201);
    expect(practitioners.create).toHaveBeenCalledWith(createPayload);
  });
});

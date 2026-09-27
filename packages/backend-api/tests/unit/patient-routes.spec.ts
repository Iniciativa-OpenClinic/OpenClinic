import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerPatientRoutes } from '../../src/arch/presentation/patient.router.js';
import { errorHandler } from '../../src/arch/presentation/error-handler.js';

type Patient = {
  id: string;
  tenant_id: string;
  full_name: string;
  cpf: string | null;
  cns: string | null;
  birth_date: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
  insurance_name: string | null;
  insurance_number: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

const patient: Patient = {
  id: 'patient-1',
  tenant_id: 'tenant-1',
  full_name: 'Maria da Silva',
  cpf: '12345678909',
  cns: null,
  birth_date: '1985-04-12',
  gender: 'FEMALE',
  email: 'maria@example.com',
  phone: '+5511999999999',
  address: 'Rua das Flores, 10',
  emergency_contact: 'Joao da Silva',
  insurance_name: null,
  insurance_number: null,
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  deleted_at: null,
};

const createPayload = {
  full_name: 'Maria da Silva',
  cpf: '12345678909',
  cns: null,
  birth_date: '1985-04-12',
  gender: 'FEMALE',
  email: 'maria@example.com',
  phone: '+5511999999999',
  address: 'Rua das Flores, 10',
  emergency_contact: 'Joao da Silva',
  insurance_name: null,
  insurance_number: null,
};

const patientJson = {
  ...patient,
  created_at: patient.created_at.toISOString(),
  updated_at: patient.updated_at.toISOString(),
};
const apps: ReturnType<typeof Fastify>[] = [];

function fixture() {
  const patients = {
    list: vi.fn().mockResolvedValue({ items: [patient], total: 1 }),
    getById: vi.fn().mockResolvedValue(patient),
    create: vi.fn().mockResolvedValue(patient),
    update: vi.fn().mockResolvedValue({ ...patient, full_name: 'Maria Souza' }),
    softDelete: vi.fn().mockResolvedValue(undefined),
  };
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  apps.push(app);

  registerPatientRoutes(app, { patients });

  return { app, patients };
}

describe('Patient REST endpoints', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(() => {
    app = fixture().app;
  });

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((instance) => instance.close()));
  });

  it('lists patients with pagination metadata', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/business/patients' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [patientJson], total: 1 });
  });

  it('creates a patient', async () => {
    const fixtureResult = fixture();
    app = fixtureResult.app;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/business/patients',
      payload: createPayload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(patientJson);
    expect(fixtureResult.patients.create).toHaveBeenCalledWith(createPayload);
  });

  it('rejects a patient without a full name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/business/patients',
      payload: { ...createPayload, full_name: '' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('gets a patient by id', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/business/patients/patient-1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(patientJson);
  });

  it('updates a patient', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/business/patients/patient-1',
      payload: { full_name: 'Maria Souza' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'patient-1', full_name: 'Maria Souza' });
  });

  it('soft-deletes a patient', async () => {
    const { app: deleteApp, patients } = fixture();

    const response = await deleteApp.inject({
      method: 'DELETE',
      url: '/api/v1/business/patients/patient-1',
    });

    expect(response.statusCode).toBe(204);
    expect(patients.softDelete).toHaveBeenCalledWith('patient-1');
  });

  it('passes pagination to the repository', async () => {
    const { app, patients } = fixture();
    const response = await app.inject({ method: 'GET', url: '/api/v1/business/patients?offset=20&limit=10' });
    expect(response.statusCode).toBe(200);
    expect(patients.list).toHaveBeenCalledWith({ offset: 20, limit: 10 });
  });

  it.each(['offset=-1', 'limit=0', 'limit=101', 'limit=abc'])('rejects invalid pagination: %s', async (query) => {
    const { app, patients } = fixture();
    const response = await app.inject({ method: 'GET', url: `/api/v1/business/patients?${query}` });
    expect(response.statusCode).toBe(400);
    expect(patients.list).not.toHaveBeenCalled();
  });

  it.each(['GET', 'PUT', 'DELETE'] as const)('returns 404 for a missing patient on %s', async (method) => {
    const { app, patients } = fixture();
    patients.getById.mockResolvedValue(null);
    patients.update.mockResolvedValue(null);
    const response = await app.inject({
      method,
      url: '/api/v1/business/patients/missing',
      ...(method === 'PUT' ? { payload: { full_name: 'Maria Souza' } } : {}),
    });
    expect(response.statusCode).toBe(404);
    expect(patients.softDelete).not.toHaveBeenCalled();
  });

  it.each([{}, { full_name: '   ' }, { email: 'invalid' }])('rejects invalid updates: %j', async (payload) => {
    const { app, patients } = fixture();
    const response = await app.inject({ method: 'PUT', url: '/api/v1/business/patients/patient-1', payload });
    expect(response.statusCode).toBe(400);
    expect(patients.update).not.toHaveBeenCalled();
  });
});

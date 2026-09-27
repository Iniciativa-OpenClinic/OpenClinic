import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PatientInput, PatientRepository } from '../domain/patient.js';
import { PatientSchema, patientErrors } from './patient.schemas.js';
import { SecurityBearer } from './openapi.schemas.js';

const basePath = '/api/v1/business/patients';
const nullableString = { type: ['string', 'null'] };
const properties = {
  full_name: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' },
  cpf: { ...nullableString, maxLength: 11 },
  cns: { ...nullableString, maxLength: 15 },
  birth_date: { ...nullableString, format: 'date' },
  gender: { ...nullableString, maxLength: 20 },
  email: { ...nullableString, format: 'email', maxLength: 255 },
  phone: { ...nullableString, maxLength: 20 },
  address: nullableString,
  emergency_contact: { ...nullableString, maxLength: 255 },
  insurance_name: { ...nullableString, maxLength: 100 },
  insurance_number: { ...nullableString, maxLength: 100 },
  allergies_notes: nullableString,
};
const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
};
const notFound = { statusCode: 404, error: 'Not Found', message: 'Patient not found' };

export function registerPatientRoutes(
  app: FastifyInstance,
  { patients }: { patients: PatientRepository | ((request: FastifyRequest) => PatientRepository) },
): void {
  const repository = (request: FastifyRequest) => typeof patients === 'function' ? patients(request) : patients;
  app.get<{ Querystring: { offset: number; limit: number } }>(basePath, {
    schema: {
      tags: ['Patients'],
      security: SecurityBearer,
      summary: 'List patients',
      description: 'Lists non-deleted patients in the authenticated tenant. Requires op_patients READ permission.',
      response: { ...patientErrors, 200: {
        type: 'object', properties: { items: { type: 'array', items: PatientSchema }, total: { type: 'integer' } },
      } },
      querystring: {
        type: 'object',
        properties: {
          offset: { type: 'integer', minimum: 0, default: 0 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request) => repository(request).list({ offset: request.query.offset, limit: request.query.limit }));

  app.post<{ Body: PatientInput }>(basePath, {
    schema: {
      tags: ['Patients'],
      security: SecurityBearer,
      summary: 'Create patient',
      description: 'Creates a patient in the authenticated tenant. Requires op_patients WRITE permission. tenant_id is assigned by the server.',
      response: { ...patientErrors, 201: PatientSchema },
      body: { type: 'object', required: ['full_name'], additionalProperties: false, properties },
    },
  }, async (request, reply) => reply.status(201).send(await repository(request).create(request.body)));

  app.get<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Patients'], params, security: SecurityBearer, summary: 'Get patient',
      description: 'Requires op_patients READ permission. Deleted patients and patients in other tenants return 404.',
      response: { ...patientErrors, 200: PatientSchema } },
  }, async (request, reply) => {
    const patient = await repository(request).getById(request.params.id);
    return patient ? reply.send(patient) : reply.status(404).send(notFound);
  });

  app.put<{ Params: { id: string }; Body: Partial<PatientInput> }>(`${basePath}/:id`, {
    schema: {
      tags: ['Patients'],
      security: SecurityBearer,
      summary: 'Update patient',
      description: 'Updates supplied fields; omitted fields remain unchanged. Requires op_patients WRITE permission.',
      response: { ...patientErrors, 200: PatientSchema },
      params,
      body: { type: 'object', minProperties: 1, additionalProperties: false, properties },
    },
  }, async (request, reply) => {
    const patient = await repository(request).update(request.params.id, request.body);
    return patient ? reply.send(patient) : reply.status(404).send(notFound);
  });

  app.delete<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Patients'], params, security: SecurityBearer, summary: 'Delete patient',
      description: 'Soft-deletes a patient in the authenticated tenant. Requires op_patients DELETE permission.',
      response: { ...patientErrors, 204: { type: 'null', description: 'Patient deleted; empty response' } } },
  }, async (request, reply) => {
    if (!await repository(request).getById(request.params.id)) return reply.status(404).send(notFound);
    await repository(request).softDelete(request.params.id);
    return reply.status(204).send();
  });
}


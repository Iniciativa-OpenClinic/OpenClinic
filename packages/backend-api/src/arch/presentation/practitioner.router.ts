import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PractitionerInput, PractitionerRepository } from '../domain/practitioner.js';
import { PractitionerSchema, practitionerErrors } from './practitioner.schemas.js';
import { SecurityBearer } from './openapi.schemas.js';
import { PractitionerService } from '../application/services/practitioner.service.js';

const basePath = '/api/v1/business/practitioners';
const nullableString = { type: ['string', 'null'] };
const properties = {
  full_name: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' },
  cpf: { ...nullableString, pattern: '^[0-9]{11}$' },
  practitioner_type: { type: 'string', minLength: 1, maxLength: 50, pattern: '\\S' },
  job_title: { ...nullableString, maxLength: 100 },
  council_type: { ...nullableString, maxLength: 20 },
  council_number: { ...nullableString, maxLength: 20 },
  council_uf: { ...nullableString, enum: [null, 'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] },
  primary_specialty: { ...nullableString, maxLength: 150 },
  is_clinical_staff: { type: 'boolean' },
  email: { ...nullableString, format: 'email', maxLength: 255 },
  phone: { ...nullableString, maxLength: 20 },
};
const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
};
const notFound = { statusCode: 404, error: 'Not Found', message: 'Practitioner not found' };

export function registerPractitionerRoutes(
  app: FastifyInstance,
  { practitioners }: { practitioners: PractitionerRepository | ((request: FastifyRequest) => PractitionerRepository) },
): void {
  const repository = (request: FastifyRequest) => typeof practitioners === 'function' ? practitioners(request) : practitioners;
  app.get<{ Querystring: { offset: number; limit: number } }>(basePath, {
    schema: {
      tags: ['Practitioners'],
      security: SecurityBearer,
      summary: 'List practitioners',
      description: 'Lists non-deleted practitioners in the authenticated tenant. Requires base_staff READ permission.',
      response: { ...practitionerErrors, 200: {
        type: 'object', properties: { items: { type: 'array', items: PractitionerSchema }, total: { type: 'integer' } },
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

  app.post<{ Body: PractitionerInput }>(basePath, {
    schema: {
      tags: ['Practitioners'],
      security: SecurityBearer,
      summary: 'Create practitioner',
      description: 'Creates a practitioner in the authenticated tenant. Requires base_staff WRITE permission. tenant_id is assigned by the server.',
      response: { ...practitionerErrors, 201: PractitionerSchema },
      body: { type: 'object', required: ['full_name', 'practitioner_type'], additionalProperties: false, properties },
    },
  }, async (request, reply) => reply.status(201).send(await new PractitionerService(repository(request)).create(request.body)));

  app.get<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Practitioners'], params, security: SecurityBearer, summary: 'Get practitioner',
      description: 'Requires base_staff READ permission. Deleted practitioners and practitioners in other tenants return 404.',
      response: { ...practitionerErrors, 200: PractitionerSchema } },
  }, async (request, reply) => {
    const practitioner = await repository(request).getById(request.params.id);
    return practitioner ? reply.send(practitioner) : reply.status(404).send(notFound);
  });

  app.put<{ Params: { id: string }; Body: Partial<PractitionerInput> }>(`${basePath}/:id`, {
    schema: {
      tags: ['Practitioners'],
      security: SecurityBearer,
      summary: 'Update practitioner',
      description: 'Updates supplied fields; omitted fields remain unchanged. Requires base_staff WRITE permission.',
      response: { ...practitionerErrors, 200: PractitionerSchema },
      params,
      body: { type: 'object', minProperties: 1, additionalProperties: false, properties },
    },
  }, async (request, reply) => {
    const practitioner = await new PractitionerService(repository(request)).update(request.params.id, request.body);
    return practitioner ? reply.send(practitioner) : reply.status(404).send(notFound);
  });

  app.delete<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Practitioners'], params, security: SecurityBearer, summary: 'Delete practitioner',
      description: 'Soft-deletes a practitioner in the authenticated tenant. Requires base_staff DELETE permission.',
      response: { ...practitionerErrors, 204: { type: 'null', description: 'Practitioner deleted; empty response' } } },
  }, async (request, reply) => {
    if (!await repository(request).getById(request.params.id)) return reply.status(404).send(notFound);
    await repository(request).softDelete(request.params.id);
    return reply.status(204).send();
  });
}


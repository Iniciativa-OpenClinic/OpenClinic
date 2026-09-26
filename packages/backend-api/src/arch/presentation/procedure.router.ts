import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError, ErrorCode } from '@openclinic/core';
import type { ProcedureInput, ProcedureListOptions, ProcedureRepository } from '../domain/procedure.js';
import { ProcedureSchema, procedureErrors } from './procedure.schemas.js';
import { SecurityBearer } from './openapi.schemas.js';
import { ProcedureService } from '../application/services/procedure.service.js';

const basePath = '/api/v1/business/procedures';
const nullableString = { type: ['string', 'null'] };
const properties = {
  name: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' },
  description: { ...nullableString, maxLength: 10000 },
  category: { ...nullableString, maxLength: 100 },
  tuss_code: { ...nullableString, pattern: '^[0-9]{8}$' },
  estimated_duration_minutes: { type: 'integer', minimum: 1, maximum: 2147483647 },
  requires_room: { type: 'boolean' },
  preparation_instructions: { ...nullableString, maxLength: 10000 },
  return_after_days: { type: ['integer', 'null'], minimum: 0, maximum: 2147483647 },
  minimum_interval_days: { type: ['integer', 'null'], minimum: 0, maximum: 2147483647 },
  calendar_color: { ...nullableString, pattern: '^#[0-9A-Fa-f]{6}$' },
  is_active: { type: 'boolean' },
  practitioner_ids: { type: 'array', maxItems: 500, uniqueItems: true, items: { type: 'string', minLength: 1, maxLength: 36, pattern: '\\S' } },
};
const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
};
const notFound = { statusCode: 404, error: 'Not Found', message: 'Procedure not found' };

// AJV normally coerces null to false. Activity and room requirements must be explicit booleans.
async function validateBooleans(request: FastifyRequest): Promise<void> {
  if (!request.body || typeof request.body !== 'object') return;
  const body = request.body as Record<string, unknown>;
  for (const field of ['requires_room', 'is_active']) {
    if (field in body && typeof body[field] !== 'boolean') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `${field} must be a boolean`, 400);
    }
  }
}

export function registerProcedureRoutes(
  app: FastifyInstance,
  { procedures }: { procedures: ProcedureRepository | ((request: FastifyRequest) => ProcedureRepository) },
): void {
  const repository = (request: FastifyRequest) => typeof procedures === 'function' ? procedures(request) : procedures;
  app.get<{ Querystring: ProcedureListOptions }>(basePath, {
    schema: {
      tags: ['Procedures'],
      security: SecurityBearer,
      summary: 'List procedures',
      description: 'Lists non-deleted procedures in the authenticated tenant. Requires base_procedures READ permission.',
      response: { ...procedureErrors, 200: {
        type: 'object', properties: { items: { type: 'array', items: ProcedureSchema }, total: { type: 'integer' } },
      } },
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' },
          is_active: { type: 'boolean' },
          offset: { type: 'integer', minimum: 0, default: 0 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request) => repository(request).list(request.query));

  app.post<{ Body: ProcedureInput }>(basePath, {
    preValidation: validateBooleans,
    schema: {
      tags: ['Procedures'],
      security: SecurityBearer,
      summary: 'Create procedure',
      description: 'Creates a procedure in the authenticated tenant. Requires base_procedures WRITE permission. tenant_id is assigned by the server.',
      response: { ...procedureErrors, 201: ProcedureSchema },
      body: { type: 'object', required: ['name', 'estimated_duration_minutes', 'requires_room'], additionalProperties: false, properties },
    },
  }, async (request, reply) => reply.status(201).send(await new ProcedureService(repository(request)).create(request.body)));

  app.get<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Procedures'], params, security: SecurityBearer, summary: 'Get procedure',
      description: 'Requires base_procedures READ permission. Deleted procedures and procedures in other tenants return 404.',
      response: { ...procedureErrors, 200: ProcedureSchema } },
  }, async (request, reply) => {
    const procedure = await repository(request).getById(request.params.id);
    return procedure ? reply.send(procedure) : reply.status(404).send(notFound);
  });

  app.put<{ Params: { id: string }; Body: Partial<ProcedureInput> }>(`${basePath}/:id`, {
    preValidation: validateBooleans,
    schema: {
      tags: ['Procedures'],
      security: SecurityBearer,
      summary: 'Update procedure',
      description: 'Updates supplied fields; omitted fields remain unchanged. Requires base_procedures WRITE permission.',
      response: { ...procedureErrors, 200: ProcedureSchema },
      params,
      body: { type: 'object', minProperties: 1, additionalProperties: false, properties },
    },
  }, async (request, reply) => {
    const procedure = await new ProcedureService(repository(request)).update(request.params.id, request.body);
    return procedure ? reply.send(procedure) : reply.status(404).send(notFound);
  });

  app.delete<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Procedures'], params, security: SecurityBearer, summary: 'Delete procedure',
      description: 'Soft-deletes a procedure in the authenticated tenant. Requires base_procedures DELETE permission.',
      response: { ...procedureErrors, 204: { type: 'null', description: 'Procedure deleted; empty response' } } },
  }, async (request, reply) => {
    if (!await repository(request).softDelete(request.params.id)) return reply.status(404).send(notFound);
    return reply.status(204).send();
  });
}

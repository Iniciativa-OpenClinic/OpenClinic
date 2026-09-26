import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { UnitInput, UnitRepository } from '../domain/unit.js';
import { UnitSchema, unitErrors } from './unit.schemas.js';
import { SecurityBearer } from './openapi.schemas.js';
import { UnitService } from '../application/services/unit.service.js';

const basePath = '/api/v1/business/units';
const nullableString = { type: ['string', 'null'] };
const properties = {
  name: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' },
  organization_id: { type: 'string', minLength: 1, maxLength: 36, pattern: '\\S' },
  trade_name: { ...nullableString, maxLength: 255 },
  cnes_code: { ...nullableString, maxLength: 15 },
  tax_id: { ...nullableString, maxLength: 50 },
  cnpj: { ...nullableString, maxLength: 14, pattern: '^[0-9]{14}$' },
  phone: { ...nullableString, maxLength: 20 },
  email: { ...nullableString, maxLength: 255, format: 'email' },
  postal_code: { ...nullableString, maxLength: 20 },
  street: { ...nullableString, maxLength: 255 },
  number: { ...nullableString, maxLength: 20 },
  complement: { ...nullableString, maxLength: 100 },
  neighborhood: { ...nullableString, maxLength: 100 },
  city: { ...nullableString, maxLength: 100 },
  state: { ...nullableString, maxLength: 100 },
  country: { ...nullableString, maxLength: 50 },
  is_headquarters: { type: 'boolean' },
};
const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
};
const notFound = { statusCode: 404, error: 'Not Found', message: 'Unit not found' };

export function registerUnitRoutes(
  app: FastifyInstance,
  { units }: { units: UnitRepository | ((request: FastifyRequest) => UnitRepository) },
): void {
  const repository = (request: FastifyRequest) => typeof units === 'function' ? units(request) : units;
  app.get<{ Querystring: { offset: number; limit: number } }>(basePath, {
    schema: {
      tags: ['Units'],
      security: SecurityBearer,
      summary: 'List units',
      description: 'Lists non-deleted units in the authenticated tenant. Requires menu_sys_institution READ permission.',
      response: { ...unitErrors, 200: {
        type: 'object', properties: { items: { type: 'array', items: UnitSchema }, total: { type: 'integer' } },
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

  app.post<{ Body: UnitInput }>(basePath, {
    schema: {
      tags: ['Units'],
      security: SecurityBearer,
      summary: 'Create unit',
      description: 'Creates a unit in the authenticated tenant. Requires menu_sys_institution WRITE permission. tenant_id is assigned by the server.',
      response: { ...unitErrors, 201: UnitSchema },
      body: { type: 'object', required: ['name', 'organization_id'], additionalProperties: false, properties },
    },
  }, async (request, reply) => reply.status(201).send(await new UnitService(repository(request)).create(request.body)));

  app.get<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Units'], params, security: SecurityBearer, summary: 'Get unit',
      description: 'Requires menu_sys_institution READ permission. Deleted units and units in other tenants return 404.',
      response: { ...unitErrors, 200: UnitSchema } },
  }, async (request, reply) => {
    const unit = await repository(request).getById(request.params.id);
    return unit ? reply.send(unit) : reply.status(404).send(notFound);
  });

  app.put<{ Params: { id: string }; Body: Partial<UnitInput> }>(`${basePath}/:id`, {
    schema: {
      tags: ['Units'],
      security: SecurityBearer,
      summary: 'Update unit',
      description: 'Updates supplied fields; omitted fields remain unchanged. Requires menu_sys_institution WRITE permission.',
      response: { ...unitErrors, 200: UnitSchema },
      params,
      body: { type: 'object', minProperties: 1, additionalProperties: false, properties },
    },
  }, async (request, reply) => {
    const unit = await new UnitService(repository(request)).update(request.params.id, request.body);
    return unit ? reply.send(unit) : reply.status(404).send(notFound);
  });

  app.delete<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Units'], params, security: SecurityBearer, summary: 'Delete unit',
      description: 'Soft-deletes a unit in the authenticated tenant. Requires menu_sys_institution DELETE permission.',
      response: { ...unitErrors, 204: { type: 'null', description: 'Unit deleted; empty response' } } },
  }, async (request, reply) => {
    if (!await repository(request).getById(request.params.id)) return reply.status(404).send(notFound);
    await repository(request).softDelete(request.params.id);
    return reply.status(204).send();
  });
}


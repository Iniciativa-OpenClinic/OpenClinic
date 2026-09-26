import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError, ErrorCode } from '@openclinic/core';
import type { AvailabilityInput, AvailabilityVersionInput, AvailabilityListOptions, AvailabilityRepository } from '../domain/availability.js';
import { AvailabilitySchema, availabilityErrors } from './availability.schemas.js';
import { SecurityBearer } from './openapi.schemas.js';
import { AvailabilityService } from '../application/services/availability.service.js';

const basePath = '/api/v1/business/availabilities';
const nullableString = { type: ['string', 'null'] };
const properties = {
  unit_id: { type: 'string', minLength: 1, maxLength: 36, pattern: '\\S' },
  practitioner_id: { ...nullableString, minLength: 1, maxLength: 36, pattern: '\\S' },
  room_id: { ...nullableString, minLength: 1, maxLength: 36, pattern: '\\S' },
  day_of_week: { type: 'integer', minimum: 0, maximum: 6 },
  start_time: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
  end_time: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
  slot_duration_minutes: { type: 'integer', minimum: 1, maximum: 1439 },
  timezone: { type: 'string', minLength: 1, maxLength: 100 },
  valid_from: { type: 'string', format: 'date' },
  valid_until: { ...nullableString, format: 'date' },
  notes: { ...nullableString, maxLength: 10000 },
};
const versionProperties = {
  day_of_week: properties.day_of_week, start_time: properties.start_time, end_time: properties.end_time,
  slot_duration_minutes: properties.slot_duration_minutes, valid_from: properties.valid_from,
  valid_until: properties.valid_until, notes: properties.notes,
};
const pagination = { type: 'object', properties: {
  offset: { type: 'integer', minimum: 0, default: 0 },
  limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
} };
const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
};
const notFound = { statusCode: 404, error: 'Not Found', message: 'Availability not found' };

// Reject null and coercible strings for numeric fields before AJV mutates the payload.
async function validateNumbers(request: FastifyRequest): Promise<void> {
  if (!request.body || typeof request.body !== 'object') return;
  const body = request.body as Record<string, unknown>;
  for (const field of ['day_of_week', 'slot_duration_minutes']) {
    if (field in body && typeof body[field] !== 'number') throw new AppError(ErrorCode.VALIDATION_ERROR, field + ' must be a number', 400);
  }
}
export function registerAvailabilityRoutes(
  app: FastifyInstance,
  { availabilities }: { availabilities: AvailabilityRepository | ((request: FastifyRequest) => AvailabilityRepository) },
): void {
  const repository = (request: FastifyRequest) => typeof availabilities === 'function' ? availabilities(request) : availabilities;
  app.get<{ Querystring: AvailabilityListOptions }>(basePath, {
    schema: {
      tags: ['Availabilities'],
      security: SecurityBearer,
      summary: 'List availabilities',
      description: 'Lists non-deleted availabilities in the authenticated tenant. Requires op_schedule READ permission.',
      response: { ...availabilityErrors, 200: {
        type: 'object', properties: { items: { type: 'array', items: AvailabilitySchema }, total: { type: 'integer' } },
      } },
      querystring: { ...pagination, properties: { ...pagination.properties,
        unit_id: properties.unit_id, practitioner_id: { type: 'string', minLength: 1, maxLength: 36 },
        room_id: { type: 'string', minLength: 1, maxLength: 36 }, on_date: { type: 'string', format: 'date' },
      } },
    },
  }, async (request) => repository(request).list(request.query));

  app.post<{ Body: AvailabilityInput }>(basePath, {
    preValidation: validateNumbers,
    schema: {
      tags: ['Availabilities'],
      security: SecurityBearer,
      summary: 'Create availability',
      description: 'Creates a availability in the authenticated tenant. Requires op_schedule WRITE permission. tenant_id is assigned by the server.',
      response: { ...availabilityErrors, 201: AvailabilitySchema },
      body: { type: 'object', required: ['unit_id', 'day_of_week', 'start_time', 'end_time', 'slot_duration_minutes', 'timezone', 'valid_from'], additionalProperties: false, properties },
    },
  }, async (request, reply) => reply.status(201).send(await new AvailabilityService(repository(request)).create(request.body)));

  app.get<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Availabilities'], params, security: SecurityBearer, summary: 'Get availability',
      description: 'Requires op_schedule READ permission. Deleted availabilities and availabilities in other tenants return 404.',
      response: { ...availabilityErrors, 200: AvailabilitySchema } },
  }, async (request, reply) => {
    const availability = await repository(request).getById(request.params.id);
    return availability ? reply.send(availability) : reply.status(404).send(notFound);
  });

  app.put<{ Params: { id: string }; Body: AvailabilityVersionInput }>(`${basePath}/:id`, {
    preValidation: validateNumbers,
    schema: {
      tags: ['Availabilities'],
      security: SecurityBearer,
      summary: 'Create availability version',
      description: 'Creates a new version and closes the previous validity period; returns a new ID. Requires op_schedule WRITE permission.',
      response: { ...availabilityErrors, 201: AvailabilitySchema },
      params,
      body: { type: 'object', required: ['valid_from'], additionalProperties: false, properties: versionProperties },
    },
  }, async (request, reply) => {
    const availability = await new AvailabilityService(repository(request)).version(request.params.id, request.body);
    return availability ? reply.status(201).send(availability) : reply.status(404).send(notFound);
  });

  app.get<{ Params: { id: string }; Querystring: { offset: number; limit: number } }>(basePath + '/:id/history', {
    schema: { tags: ['Availabilities'], params, querystring: pagination, security: SecurityBearer,
      summary: 'Get availability history', description: 'Lists all versions, including deleted ones, in the authenticated tenant. Requires op_schedule READ.',
      response: { ...availabilityErrors, 200: { type: 'object', properties: { items: { type: 'array', items: AvailabilitySchema }, total: { type: 'integer' } } } } },
  }, async (request, reply) => {
    const history = await repository(request).history(request.params.id, request.query);
    return history ? reply.send(history) : reply.status(404).send(notFound);
  });
  app.delete<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Availabilities'], params, security: SecurityBearer, summary: 'Delete availability',
      description: 'Soft-deletes a availability in the authenticated tenant. Requires op_schedule DELETE permission.',
      response: { ...availabilityErrors, 204: { type: 'null', description: 'Availability deleted; empty response' } } },
  }, async (request, reply) => {
    if (!await repository(request).softDelete(request.params.id)) return reply.status(404).send(notFound);
    return reply.status(204).send();
  });
}

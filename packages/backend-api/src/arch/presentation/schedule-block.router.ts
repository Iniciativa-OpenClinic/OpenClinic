import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ScheduleBlockInput, BlockFilters, BlockOccurrenceFilters, ScheduleBlockRepository } from '../domain/schedule-block.js';
import { ScheduleBlockSchema, scheduleBlockErrors, BlockOccurrenceSchema } from './schedule-block.schemas.js';
import { SecurityBearer } from './openapi.schemas.js';
import { ScheduleBlockService } from '../application/services/schedule-block.service.js';

const basePath = '/api/v1/business/blocks';
const nullableString = { type: ['string', 'null'] };
const instant = { type: 'string', format: 'date-time', pattern: '(Z|[+-][0-9]{2}:[0-9]{2})$' };
const properties = {
  unit_id: { ...nullableString, minLength: 1, maxLength: 36, pattern: '\\S' },
  practitioner_id: { ...nullableString, minLength: 1, maxLength: 36, pattern: '\\S' },
  room_id: { ...nullableString, minLength: 1, maxLength: 36, pattern: '\\S' },
  starts_at: instant, ends_at: instant,
  timezone: { type: 'string', minLength: 1, maxLength: 100 },
  reason: { ...nullableString, maxLength: 10000 },
  recurrence: { type: ['object', 'null'], required: ['frequency', 'interval'], additionalProperties: false, properties: {
    frequency: { type: 'string', enum: ['DAILY', 'WEEKLY'] },
    interval: { type: 'integer', minimum: 1, maximum: 52 },
    until: { ...instant, type: ['string', 'null'] },
  } },
};
const pagination = { offset: { type: 'integer', minimum: 0, default: 0 }, limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 } };
const filters = { ...pagination, unit_id: { type: 'string', minLength: 1, maxLength: 36 },
  practitioner_id: { type: 'string', minLength: 1, maxLength: 36 }, room_id: { type: 'string', minLength: 1, maxLength: 36 } };
const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
};
const notFound = { statusCode: 404, error: 'Not Found', message: 'ScheduleBlock not found' };

export function registerScheduleBlockRoutes(
  app: FastifyInstance,
  { scheduleBlocks }: { scheduleBlocks: ScheduleBlockRepository | ((request: FastifyRequest) => ScheduleBlockRepository) },
): void {
  const repository = (request: FastifyRequest) => typeof scheduleBlocks === 'function' ? scheduleBlocks(request) : scheduleBlocks;
  app.get<{ Querystring: BlockFilters }>(basePath, {
    schema: {
      tags: ['ScheduleBlocks'],
      security: SecurityBearer,
      summary: 'List scheduleBlocks',
      description: 'Lists non-deleted scheduleBlocks in the authenticated tenant. Requires op_schedule READ permission.',
      response: { ...scheduleBlockErrors, 200: {
        type: 'object', properties: { items: { type: 'array', items: ScheduleBlockSchema }, total: { type: 'integer' } },
      } },
      querystring: { type: 'object', properties: filters },
    },
  }, async (request) => repository(request).list(request.query));

  app.get<{ Querystring: BlockOccurrenceFilters }>(basePath + '/occurrences', {
    schema: { tags: ['ScheduleBlocks'], security: SecurityBearer, summary: 'List block occurrences',
      description: 'Expands recurring blocks within a bounded interval; includes applicable global blocks. Requires op_schedule READ.',
      querystring: { type: 'object', required: ['from', 'to'], properties: { ...filters, from: instant, to: instant } },
      response: { ...scheduleBlockErrors, 200: { type: 'object', properties: { items: { type: 'array', items: BlockOccurrenceSchema }, total: { type: 'integer' } } } } },
  }, async request => new ScheduleBlockService(repository(request)).occurrences(request.query));
  app.post<{ Body: ScheduleBlockInput }>(basePath, {
    schema: {
      tags: ['ScheduleBlocks'],
      security: SecurityBearer,
      summary: 'Create schedule-block',
      description: 'Creates a schedule-block in the authenticated tenant. Requires op_schedule WRITE permission. tenant_id is assigned by the server.',
      response: { ...scheduleBlockErrors, 201: ScheduleBlockSchema },
      body: { type: 'object', required: ['starts_at', 'ends_at', 'timezone'], additionalProperties: false, properties },
    },
  }, async (request, reply) => reply.status(201).send(await new ScheduleBlockService(repository(request)).create(request.body)));

  app.get<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['ScheduleBlocks'], params, security: SecurityBearer, summary: 'Get schedule-block',
      description: 'Requires op_schedule READ permission. Deleted scheduleBlocks and scheduleBlocks in other tenants return 404.',
      response: { ...scheduleBlockErrors, 200: ScheduleBlockSchema } },
  }, async (request, reply) => {
    const block = await repository(request).getById(request.params.id);
    return block ? reply.send(block) : reply.status(404).send(notFound);
  });

  app.put<{ Params: { id: string }; Body: Partial<ScheduleBlockInput> }>(`${basePath}/:id`, {
    schema: {
      tags: ['ScheduleBlocks'],
      security: SecurityBearer,
      summary: 'Update schedule-block',
      description: 'Updates supplied fields; omitted fields remain unchanged. Requires op_schedule WRITE permission.',
      response: { ...scheduleBlockErrors, 200: ScheduleBlockSchema },
      params,
      body: { type: 'object', minProperties: 1, additionalProperties: false, properties },
    },
  }, async (request, reply) => {
    const block = await new ScheduleBlockService(repository(request)).update(request.params.id, request.body);
    return block ? reply.send(block) : reply.status(404).send(notFound);
  });

  app.delete<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['ScheduleBlocks'], params, security: SecurityBearer, summary: 'Delete schedule-block',
      description: 'Soft-deletes a schedule-block in the authenticated tenant. Requires op_schedule DELETE permission.',
      response: { ...scheduleBlockErrors, 204: { type: 'null', description: 'ScheduleBlock deleted; empty response' } } },
  }, async (request, reply) => {
    if (!await repository(request).softDelete(request.params.id)) return reply.status(404).send(notFound);
    return reply.status(204).send();
  });
}

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError, ErrorCode } from '@openclinic/core';
import type { RoomInput, RoomListOptions, RoomRepository } from '../domain/room.js';
import { RoomSchema, roomErrors } from './room.schemas.js';
import { SecurityBearer } from './openapi.schemas.js';
import { RoomService } from '../application/services/room.service.js';

const basePath = '/api/v1/business/rooms';
const nullableString = { type: ['string', 'null'] };
const properties = {
  name: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' },
  unit_id: { type: 'string', minLength: 1, maxLength: 36, pattern: '\\S' },
  room_type: { ...nullableString, maxLength: 100 },
  is_schedulable: { type: 'boolean' },
  equipment: { type: 'array', maxItems: 100, uniqueItems: true, items: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' } },
  notes: { ...nullableString, maxLength: 10000 },
  is_active: { type: 'boolean' },
};
const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', minLength: 1 } },
};
const notFound = { statusCode: 404, error: 'Not Found', message: 'Room not found' };

// AJV normally coerces null to false. Activity and schedulability must be explicit booleans.
async function validateBooleans(request: FastifyRequest): Promise<void> {
  if (!request.body || typeof request.body !== 'object') return;
  const body = request.body as Record<string, unknown>;
  for (const field of ['is_schedulable', 'is_active']) {
    if (field in body && typeof body[field] !== 'boolean') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `${field} must be a boolean`, 400);
    }
  }
}

export function registerRoomRoutes(
  app: FastifyInstance,
  { rooms }: { rooms: RoomRepository | ((request: FastifyRequest) => RoomRepository) },
): void {
  const repository = (request: FastifyRequest) => typeof rooms === 'function' ? rooms(request) : rooms;
  app.get<{ Querystring: RoomListOptions }>(basePath, {
    schema: {
      tags: ['Rooms'],
      security: SecurityBearer,
      summary: 'List rooms',
      description: 'Lists non-deleted rooms in the authenticated tenant. Requires menu_sys_institution READ permission.',
      response: { ...roomErrors, 200: {
        type: 'object', properties: { items: { type: 'array', items: RoomSchema }, total: { type: 'integer' } },
      } },
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' },
          unit_id: { type: 'string', minLength: 1, maxLength: 36, pattern: '\\S' },
          is_schedulable: { type: 'boolean' },
          is_active: { type: 'boolean' },
          offset: { type: 'integer', minimum: 0, default: 0 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request) => repository(request).list(request.query));

  app.post<{ Body: RoomInput }>(basePath, {
    preValidation: validateBooleans,
    schema: {
      tags: ['Rooms'],
      security: SecurityBearer,
      summary: 'Create room',
      description: 'Creates a room in the authenticated tenant. Requires menu_sys_institution WRITE permission. tenant_id is assigned by the server.',
      response: { ...roomErrors, 201: RoomSchema },
      body: { type: 'object', required: ['name', 'unit_id', 'is_schedulable'], additionalProperties: false, properties },
    },
  }, async (request, reply) => reply.status(201).send(await new RoomService(repository(request)).create(request.body)));

  app.get<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Rooms'], params, security: SecurityBearer, summary: 'Get room',
      description: 'Requires menu_sys_institution READ permission. Deleted rooms and rooms in other tenants return 404.',
      response: { ...roomErrors, 200: RoomSchema } },
  }, async (request, reply) => {
    const room = await repository(request).getById(request.params.id);
    return room ? reply.send(room) : reply.status(404).send(notFound);
  });

  app.put<{ Params: { id: string }; Body: Partial<RoomInput> }>(`${basePath}/:id`, {
    preValidation: validateBooleans,
    schema: {
      tags: ['Rooms'],
      security: SecurityBearer,
      summary: 'Update room',
      description: 'Updates supplied fields; omitted fields remain unchanged. Requires menu_sys_institution WRITE permission.',
      response: { ...roomErrors, 200: RoomSchema },
      params,
      body: { type: 'object', minProperties: 1, additionalProperties: false, properties },
    },
  }, async (request, reply) => {
    const room = await new RoomService(repository(request)).update(request.params.id, request.body);
    return room ? reply.send(room) : reply.status(404).send(notFound);
  });

  app.delete<{ Params: { id: string } }>(`${basePath}/:id`, {
    schema: { tags: ['Rooms'], params, security: SecurityBearer, summary: 'Delete room',
      description: 'Soft-deletes a room in the authenticated tenant. Requires menu_sys_institution DELETE permission.',
      response: { ...roomErrors, 204: { type: 'null', description: 'Room deleted; empty response' } } },
  }, async (request, reply) => {
    if (!await repository(request).softDelete(request.params.id)) return reply.status(404).send(notFound);
    return reply.status(204).send();
  });
}

import { ProblemDetailsSchema } from './openapi.schemas.js';

const nullableString = { type: ['string', 'null'] };
export const RoomSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    tenant_id: { type: 'string' },
    name: { type: 'string' },
    unit_id: { type: 'string' },
    room_type: nullableString,
    is_schedulable: { type: 'boolean' },
    equipment: { type: 'array', items: { type: 'string' } },
    notes: nullableString,
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    deleted_at: { ...nullableString, format: 'date-time' },
  },
};

// Inline errors also allow the router to be registered in isolation.
const { $id: _id, ...problem } = ProblemDetailsSchema;
export const roomErrors = {
  409: { ...problem, description: 'Room cannot change unit while availability, appointment history or unit-scoped block records exist' },
  400: { ...problem, description: 'Invalid request' },
  422: { ...problem, description: 'Invalid room data or unit outside the current tenant' },
  401: { ...problem, description: 'Missing or invalid bearer token' },
  403: { ...problem, description: 'Missing tenant or room permission' },
  404: {
    type: 'object', description: 'Room not found in the current tenant',
    properties: { statusCode: { type: 'integer' }, error: { type: 'string' }, message: { type: 'string' } },
  },
  500: { ...problem, description: 'Internal server error' },
};

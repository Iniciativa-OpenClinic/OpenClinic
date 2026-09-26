import { ProblemDetailsSchema } from './openapi.schemas.js';

const nullableString = { type: ['string', 'null'] };
export const AvailabilitySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    tenant_id: { type: 'string' },
    unit_id: { type: 'string' }, practitioner_id: nullableString, room_id: nullableString,
    series_id: { type: 'string' }, replaces_id: nullableString,
    day_of_week: { type: 'integer' }, start_time: { type: 'string' }, end_time: { type: 'string' },
    slot_duration_minutes: { type: 'integer' }, timezone: { type: 'string' },
    valid_from: { type: 'string', format: 'date' }, valid_until: { ...nullableString, format: 'date' },
    notes: nullableString,
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    deleted_at: { ...nullableString, format: 'date-time' },
  },
};

// Inline errors also allow the router to be registered in isolation.
const { $id: _id, ...problem } = ProblemDetailsSchema;
export const availabilityErrors = {
  400: { ...problem, description: 'Invalid request' },
  409: { ...problem, description: 'Only the latest version can be changed' },
  422: { ...problem, description: 'Invalid window, validity period, timezone or resource' },
  401: { ...problem, description: 'Missing or invalid bearer token' },
  403: { ...problem, description: 'Missing tenant or availability permission' },
  404: {
    type: 'object', description: 'Availability not found in the current tenant',
    properties: { statusCode: { type: 'integer' }, error: { type: 'string' }, message: { type: 'string' } },
  },
  500: { ...problem, description: 'Internal server error' },
};

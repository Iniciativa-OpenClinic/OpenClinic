import { ProblemDetailsSchema } from './openapi.schemas.js';

const nullableString = { type: ['string', 'null'] };
export const ScheduleBlockSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    tenant_id: { type: 'string' },
    unit_id: nullableString, practitioner_id: nullableString, room_id: nullableString,
    starts_at: { type: 'string', format: 'date-time' }, ends_at: { type: 'string', format: 'date-time' },
    timezone: { type: 'string' }, reason: nullableString,
    recurrence: { type: ['object', 'null'], properties: {
      frequency: { type: 'string', enum: ['DAILY', 'WEEKLY'] }, interval: { type: 'integer' },
      until: { ...nullableString, format: 'date-time' },
    } },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    deleted_at: { ...nullableString, format: 'date-time' },
  },
};

// Inline errors also allow the router to be registered in isolation.
const { $id: _id, ...problem } = ProblemDetailsSchema;
export const scheduleBlockErrors = {
  400: { ...problem, description: 'Invalid request' },
  422: { ...problem, description: 'Invalid period, recurrence, timezone or resource' },
  401: { ...problem, description: 'Missing or invalid bearer token' },
  403: { ...problem, description: 'Missing tenant or schedule-block permission' },
  404: {
    type: 'object', description: 'ScheduleBlock not found in the current tenant',
    properties: { statusCode: { type: 'integer' }, error: { type: 'string' }, message: { type: 'string' } },
  },
  500: { ...problem, description: 'Internal server error' },
};

export const BlockOccurrenceSchema = { type: 'object', properties: {
  block_id: { type: 'string' }, unit_id: nullableString, practitioner_id: nullableString, room_id: nullableString,
  starts_at: { type: 'string', format: 'date-time' }, ends_at: { type: 'string', format: 'date-time' },
  timezone: { type: 'string' }, reason: nullableString,
} };
import { ProblemDetailsSchema } from './openapi.schemas.js';

const nullableString = { type: ['string', 'null'] };
export const ProcedureSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    tenant_id: { type: 'string' },
    name: { type: 'string' },
    description: nullableString,
    category: nullableString,
    tuss_code: nullableString,
    estimated_duration_minutes: { type: 'integer' },
    requires_room: { type: 'boolean' },
    preparation_instructions: nullableString,
    return_after_days: { type: ['integer', 'null'] },
    minimum_interval_days: { type: ['integer', 'null'] },
    calendar_color: nullableString,
    practitioner_ids: { type: 'array', items: { type: 'string' } },
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    deleted_at: { ...nullableString, format: 'date-time' },
  },
};

// Inline errors also allow the router to be registered in isolation.
const { $id: _id, ...problem } = ProblemDetailsSchema;
export const procedureErrors = {
  400: { ...problem, description: 'Invalid request' },
  422: { ...problem, description: 'Invalid procedure data or practitioners outside the current tenant' },
  401: { ...problem, description: 'Missing or invalid bearer token' },
  403: { ...problem, description: 'Missing tenant or procedure permission' },
  404: {
    type: 'object', description: 'Procedure not found in the current tenant',
    properties: { statusCode: { type: 'integer' }, error: { type: 'string' }, message: { type: 'string' } },
  },
  500: { ...problem, description: 'Internal server error' },
};

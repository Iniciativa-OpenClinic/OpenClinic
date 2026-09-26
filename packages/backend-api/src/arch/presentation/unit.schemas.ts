import { ProblemDetailsSchema } from './openapi.schemas.js';

const nullableString = { type: ['string', 'null'] };
export const UnitSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    tenant_id: { type: 'string' },
    name: { type: 'string' },
    organization_id: { type: 'string' },
    trade_name: nullableString,
    cnes_code: nullableString,
    tax_id: nullableString,
    cnpj: nullableString,
    phone: nullableString,
    email: nullableString,
    postal_code: nullableString,
    street: nullableString,
    number: nullableString,
    complement: nullableString,
    neighborhood: nullableString,
    city: nullableString,
    state: nullableString,
    country: nullableString,
    is_headquarters: { type: 'boolean' },
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    deleted_at: { ...nullableString, format: 'date-time' },
  },
};

// Inline errors also allow the router to be registered in isolation.
const { $id: _id, ...problem } = ProblemDetailsSchema;
export const unitErrors = {
  400: { ...problem, description: 'Invalid request' },
  422: { ...problem, description: 'Invalid CNPJ or organization outside the current tenant' },
  401: { ...problem, description: 'Missing or invalid bearer token' },
  403: { ...problem, description: 'Missing tenant or unit permission' },
  404: {
    type: 'object', description: 'Unit not found in the current tenant',
    properties: { statusCode: { type: 'integer' }, error: { type: 'string' }, message: { type: 'string' } },
  },
  500: { ...problem, description: 'Internal server error' },
};

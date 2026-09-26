import { ProblemDetailsSchema } from './openapi.schemas.js';

const nullableString = { type: ['string', 'null'] };
export const PractitionerSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    tenant_id: { type: 'string' },
    full_name: { type: 'string' },
    user_id: nullableString,
    cpf: nullableString, email: nullableString, phone: nullableString,
    practitioner_type: { type: 'string' },
    job_title: nullableString, council_type: nullableString,
    council_number: nullableString, council_uf: nullableString,
    primary_specialty: nullableString,
    is_clinical_staff: { type: 'boolean' },
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    deleted_at: { ...nullableString, format: 'date-time' },
  },
};

// Inline errors also allow the router to be registered in isolation.
const { $id: _id, ...problem } = ProblemDetailsSchema;
export const practitionerErrors = {
  400: { ...problem, description: 'Invalid request' },
  422: { ...problem, description: 'Invalid CPF check digits' },
  401: { ...problem, description: 'Missing or invalid bearer token' },
  403: { ...problem, description: 'Missing tenant or practitioner permission' },
  404: {
    type: 'object', description: 'Practitioner not found in the current tenant',
    properties: { statusCode: { type: 'integer' }, error: { type: 'string' }, message: { type: 'string' } },
  },
  500: { ...problem, description: 'Internal server error' },
};

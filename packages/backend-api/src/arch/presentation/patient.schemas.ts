import { ProblemDetailsSchema } from './openapi.schemas.js';

const nullableString = { type: ['string', 'null'] };
export const PatientSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    tenant_id: { type: 'string' },
    full_name: { type: 'string' },
    cpf: nullableString, cns: nullableString,
    birth_date: { ...nullableString, format: 'date' },
    gender: nullableString, email: nullableString, phone: nullableString,
    address: nullableString, emergency_contact: nullableString,
    insurance_name: nullableString, insurance_number: nullableString,
    allergies_notes: nullableString,
    is_active: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    deleted_at: { ...nullableString, format: 'date-time' },
  },
};

// Inline errors also allow the router to be registered in isolation.
const { $id: _id, ...problem } = ProblemDetailsSchema;
export const patientErrors = {
  400: { ...problem, description: 'Invalid request' },
  401: { ...problem, description: 'Missing or invalid bearer token' },
  403: { ...problem, description: 'Missing tenant or patient permission' },
  404: {
    type: 'object', description: 'Patient not found in the current tenant',
    properties: { statusCode: { type: 'integer' }, error: { type: 'string' }, message: { type: 'string' } },
  },
  500: { ...problem, description: 'Internal server error' },
};

import { ProblemDetailsSchema } from './openapi.schemas.js';
const nullable = { type: ['string', 'null'] };
export const AppointmentSchema = { type: 'object', properties: {
  id: { type: 'string' }, tenant_id: { type: 'string' }, patient_id: { type: 'string' }, practitioner_id: { type: 'string' },
  procedure_id: nullable, unit_id: nullable, room_id: nullable,
  appointment_date: { type: 'string', format: 'date-time' }, duration_minutes: { type: 'integer' },
  status: { type: 'string' }, is_overbook: { type: 'boolean' }, payer_type: { type: 'string' }, source_channel: { type: 'string' },
  notes: nullable, is_active: { type: 'boolean' },
  created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
  deleted_at: { ...nullable, format: 'date-time' },
} };
const { $id: _id, ...problem } = ProblemDetailsSchema;
export const appointmentErrors = {
  400: { ...problem, description: 'Invalid request' }, 401: { ...problem, description: 'Authentication required' },
  403: { ...problem, description: 'Tenant and op_schedule permission required' },
  404: { type: 'object', properties: { statusCode: { type: 'integer' }, error: { type: 'string' }, message: { type: 'string' } } },
  409: { ...problem, description: 'Resource conflict, unavailable period or invalid status transition' },
  422: { ...problem, description: 'Invalid appointment or related resource' }, 500: { ...problem, description: 'Internal server error' },
};

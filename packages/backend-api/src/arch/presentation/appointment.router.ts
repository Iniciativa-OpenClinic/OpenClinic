import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError, ErrorCode } from '@openclinic/core';
import { appointmentStatuses } from '../domain/appointment.js';
import type { AppointmentInput, AppointmentFilters, AppointmentRepository, AppointmentStatus, AppointmentUpdateInput } from '../domain/appointment.js';
import { validateAppointment, validateAppointmentFilters } from '../application/services/appointment.service.js';
import { AppointmentSchema, appointmentErrors } from './appointment.schemas.js';
import { SecurityBearer } from './openapi.schemas.js';

const base = '/api/v1/business/appointments';
const id = { type: 'string', minLength: 1, maxLength: 36, pattern: '\\S' };
const instant = { type: 'string', format: 'date-time', pattern: '(Z|[+-][0-9]{2}:[0-9]{2})$' };
const properties = {
  patient_id: id, practitioner_id: id, procedure_id: id, unit_id: id, room_id: { ...id, type: ['string', 'null'] },
  appointment_date: instant, duration_minutes: { type: 'integer', minimum: 1, maximum: 1440 },
  is_overbook: { type: 'boolean' }, payer_type: { type: 'string', enum: ['PARTICULAR'] },
  source_channel: { type: 'string', enum: ['RECEPTION', 'PHONE', 'API'] }, notes: { type: ['string', 'null'], maxLength: 10000 },
};
const params = { type: 'object', required: ['id'], properties: { id } };
const status = { type: 'string', enum: [...appointmentStatuses] };
const notFound = { statusCode: 404, error: 'Not Found', message: 'Appointment not found' };
const common = { tags: ['Appointments'], security: SecurityBearer };
const { source_channel: _source, ...updateProperties } = properties;
// Fastify's default AJV removes additional properties. Reject them before validation
// so clients cannot receive success for a status, tenant or session we did not save.
const strictBody = (allowed: Record<string, unknown>) => async (request: FastifyRequest) => {
  if (request.body && typeof request.body === 'object' && !Array.isArray(request.body)) {
    if (Object.keys(request.body).some(key => !Object.hasOwn(allowed, key))) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Body contains unsupported or immutable fields', 400);
    }
  }
};
export function registerAppointmentRoutes(app: FastifyInstance,
  { appointments }: { appointments: AppointmentRepository | ((request: FastifyRequest) => AppointmentRepository) }): void {
  const repo = (request: FastifyRequest) => typeof appointments === 'function' ? appointments(request) : appointments;
  app.get<{ Querystring: AppointmentFilters }>(base, { schema: { ...common, summary: 'List appointments',
    description: 'Requires op_schedule READ. Date filters select overlapping half-open periods.',
    querystring: { type: 'object', properties: { offset: { type: 'integer', minimum: 0, default: 0 }, limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, patient_id: id, practitioner_id: id, unit_id: id, room_id: id, status, from: instant, to: instant } },
    response: { ...appointmentErrors, 200: { type: 'object', properties: { items: { type: 'array', items: AppointmentSchema }, total: { type: 'integer' } } } },
  } }, async request => { validateAppointmentFilters(request.query); return repo(request).list(request.query); });
  app.post<{ Body: AppointmentInput }>(base, { preValidation: strictBody(properties), schema: { ...common, summary: 'Create appointment',
    description: 'Requires op_schedule WRITE. Starts SCHEDULED. Duration defaults to the procedure. Fit-ins bypass availability only.',
    body: { type: 'object', additionalProperties: false, required: ['patient_id', 'procedure_id', 'practitioner_id', 'unit_id', 'appointment_date', 'payer_type', 'source_channel'], properties },
    response: { ...appointmentErrors, 201: AppointmentSchema },
  } }, async (request, reply) => { validateAppointment(request.body); return reply.status(201).send(await repo(request).create(request.body)); });
  app.get<{ Params: { id: string } }>(base + '/:id', { schema: { ...common, params, summary: 'Get appointment',
    response: { ...appointmentErrors, 200: AppointmentSchema },
  } }, async (request, reply) => {
    const row = await repo(request).getById(request.params.id);
    return row ? reply.send(row) : reply.status(404).send(notFound);
  });
  app.put<{ Params: { id: string }; Body: AppointmentUpdateInput }>(base + '/:id', { preValidation: strictBody(updateProperties), schema: { ...common, params, summary: 'Update appointment',
    description: 'Requires op_schedule WRITE. Only scheduled or confirmed appointments may be edited. Omitted fields and the original source_channel are preserved.',
    body: { type: 'object', additionalProperties: false, minProperties: 1, properties: updateProperties }, response: { ...appointmentErrors, 200: AppointmentSchema },
  } }, async (request, reply) => {
    const row = await repo(request).update(request.params.id, request.body);
    return row ? reply.send(row) : reply.status(404).send(notFound);
  });
  app.patch<{ Params: { id: string }; Body: { status: AppointmentStatus } }>(base + '/:id/status', { preValidation: strictBody({ status }), schema: { ...common, params, summary: 'Change appointment status',
    description: 'Requires op_schedule WRITE. Enforces the documented lifecycle; terminal states cannot be reopened.',
    body: { type: 'object', additionalProperties: false, required: ['status'], properties: { status } }, response: { ...appointmentErrors, 200: AppointmentSchema },
  } }, async (request, reply) => {
    const row = await repo(request).changeStatus(request.params.id, request.body.status);
    return row ? reply.send(row) : reply.status(404).send(notFound);
  });
  app.delete<{ Params: { id: string } }>(base + '/:id', { schema: { ...common, params, summary: 'Delete appointment',
    description: 'Requires op_schedule DELETE. Soft-deletes and cancels an appointment before arrival; preserves history.',
    response: { ...appointmentErrors, 204: { type: 'null', description: 'Empty response' } },
  } }, async (request, reply) => {
    if (!await repo(request).softDelete(request.params.id)) return reply.status(404).send(notFound);
    return reply.status(204).send();
  });
}

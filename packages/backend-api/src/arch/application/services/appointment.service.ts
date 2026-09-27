import { AppError, ErrorCode, ValidationError } from '@openclinic/core';
import type { AppointmentFilters, AppointmentInput, AppointmentStatus } from '../../domain/appointment.js';

export const appointmentConflict = (message: string) => new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, message, 409);
export function validateAppointment(input: AppointmentInput): void {
  for (const key of ['patient_id', 'procedure_id', 'practitioner_id', 'unit_id'] as const) {
    if (!input[key]?.trim()) throw new ValidationError(key);
  }
  if (!Number.isFinite(Date.parse(input.appointment_date))) throw new ValidationError('appointment_date');
  if (input.duration_minutes !== undefined && (!Number.isInteger(input.duration_minutes) || input.duration_minutes < 1 || input.duration_minutes > 1440)) {
    throw new ValidationError('duration_minutes', 'Duration must be between 1 and 1440 minutes');
  }
  if (input.payer_type !== 'PARTICULAR') throw new ValidationError('payer_type');
  if (!['RECEPTION', 'PHONE', 'API'].includes(input.source_channel)) throw new ValidationError('source_channel');
}
export function validateAppointmentFilters({ from, to }: AppointmentFilters): void {
  if ((from && !Number.isFinite(Date.parse(from))) || (to && !Number.isFinite(Date.parse(to))) ||
    (from && to && Date.parse(from) >= Date.parse(to))) throw new ValidationError('period');
}
const transitions: Record<string, readonly AppointmentStatus[]> = {
  SCHEDULED: ['CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED'],
  CONFIRMED: ['ARRIVED', 'NO_SHOW', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [], NO_SHOW: [], CANCELLED: [],
};
export function validateAppointmentTransition(from: string, to: AppointmentStatus): void {
  if (from !== to && !transitions[from]?.includes(to)) throw appointmentConflict(`Cannot change appointment status from ${from} to ${to}`);
}

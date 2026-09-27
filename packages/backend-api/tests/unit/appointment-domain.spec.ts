import { describe, expect, it } from 'vitest';
import { validateAppointment, validateAppointmentFilters, validateAppointmentTransition } from '../../src/arch/application/services/appointment.service.js';
import type { AppointmentInput } from '../../src/arch/domain/appointment.js';

// The expected lifecycle is written from the published contract, not generated
// from the implementation's transition map. These are pure unit tests, no mocks.
const valid: AppointmentInput = { patient_id: 'patient', practitioner_id: 'professional', procedure_id: 'procedure', unit_id: 'unit', appointment_date: '2026-10-05T09:00:00-03:00', payer_type: 'PARTICULAR', source_channel: 'RECEPTION' };
describe('Appointment domain rules (real functions, no mocks)', () => {
  it('accepts the documented V1 fields with inherited or explicitly adjusted duration', () => {
    expect(() => validateAppointment(valid)).not.toThrow();
    expect(() => validateAppointment({ ...valid, duration_minutes: 45 })).not.toThrow();
  });
  it.each(['patient_id', 'practitioner_id', 'procedure_id', 'unit_id'] as const)('requires %s', field => {
    expect(() => validateAppointment({ ...valid, [field]: '   ' })).toThrow();
  });
  it.each([0, -30, 1.5, Number.NaN, Infinity])('rejects a duration without a positive whole number of minutes: %s', duration => {
    expect(() => validateAppointment({ ...valid, duration_minutes: duration })).toThrow();
  });
  it('rejects invalid dates and inverted query intervals', () => {
    expect(() => validateAppointment({ ...valid, appointment_date: 'not-a-date' })).toThrow();
    expect(() => validateAppointmentFilters({ offset: 0, limit: 20, from: '2026-10-05T10:00:00Z', to: '2026-10-05T09:00:00Z' })).toThrow();
  });
  it('does not assign a fabricated new origin to imported records', () => {
    expect(() => validateAppointment({ ...valid, source_channel: 'LEGACY' })).toThrow();
    expect(() => validateAppointment({ ...valid, source_channel: 'LEGACY' }, true)).not.toThrow();
    expect(() => validateAppointment({ ...valid, source_channel: 'arbitrary' }, true)).toThrow();
  });
  it('accepts the documented care lifecycle and its cancellation/no-show deviations', () => {
    for (const [from, to] of [['SCHEDULED', 'CONFIRMED'], ['CONFIRMED', 'ARRIVED'], ['ARRIVED', 'IN_PROGRESS'], ['IN_PROGRESS', 'COMPLETED'], ['SCHEDULED', 'NO_SHOW'], ['CONFIRMED', 'CANCELLED']] as const) {
      expect(() => validateAppointmentTransition(from, to)).not.toThrow();
    }
  });
  it('rejects shortcuts that bypass care and reopening terminal states', () => {
    for (const [from, to] of [['SCHEDULED', 'COMPLETED'], ['ARRIVED', 'NO_SHOW'], ['COMPLETED', 'IN_PROGRESS'], ['CANCELLED', 'CONFIRMED'], ['NO_SHOW', 'SCHEDULED']] as const) {
      expect(() => validateAppointmentTransition(from, to)).toThrow();
    }
  });
});

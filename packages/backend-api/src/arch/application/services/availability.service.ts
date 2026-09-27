import { ValidationError } from '@openclinic/core';
import type { AvailabilityInput, AvailabilityRepository, AvailabilityVersionInput } from '../../domain/availability.js';

export function validateAvailability(input: AvailabilityInput): void {
  if (Boolean(input.practitioner_id) === Boolean(input.room_id)) throw new ValidationError('resource', 'Supply exactly one practitioner_id or room_id');
  for (const key of ['valid_from', 'valid_until'] as const) {
    const value = input[key];
    if (value != null && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
      throw new ValidationError(key);
    }
  }
  if (input.valid_until != null && input.valid_until <= input.valid_from) throw new ValidationError('valid_until', 'Must be after valid_from (exclusive end)');
  if (!Number.isInteger(input.day_of_week) || input.day_of_week < 0 || input.day_of_week > 6) throw new ValidationError('day_of_week');
  const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!clock.test(input.start_time) || !clock.test(input.end_time) || input.start_time >= input.end_time) {
    throw new ValidationError('time', 'Use a same-day window with start_time before end_time');
  }
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  if (!Number.isInteger(input.slot_duration_minutes) || input.slot_duration_minutes < 1 || input.slot_duration_minutes > minutes(input.end_time) - minutes(input.start_time)) {
    throw new ValidationError('slot_duration_minutes', 'Must fit within the window');
  }
  try { new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format(); }
  catch { throw new ValidationError('timezone', 'Use a supported IANA timezone'); }
}

export class AvailabilityService {
  constructor(private readonly repository: AvailabilityRepository) {}
  create(input: AvailabilityInput) {
    validateAvailability(input);
    return this.repository.create(input);
  }
  version(id: string, input: AvailabilityVersionInput) {
    // The repository validates the merged version while holding the current row lock.
    return this.repository.version(id, input);
  }
}

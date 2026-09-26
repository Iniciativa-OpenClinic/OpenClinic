import { ValidationError } from '@openclinic/core';
import type { BlockOccurrenceFilters, ScheduleBlockInput, ScheduleBlockRepository } from '../../domain/schedule-block.js';

export function validateBlock(input: ScheduleBlockInput): void {
  if (Boolean(input.practitioner_id) === Boolean(input.room_id)) throw new ValidationError('resource', 'Supply exactly one practitioner_id or room_id');
  const start = Date.parse(input.starts_at), end = Date.parse(input.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new ValidationError('period', 'ends_at must be after starts_at');
  try { new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format(); }
  catch { throw new ValidationError('timezone', 'Use a supported IANA timezone'); }
  if (input.recurrence) {
    const local = (value: string) => {
      const parts = new Intl.DateTimeFormat('en', { timeZone: input.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
      return ['year', 'month', 'day', 'hour', 'minute', 'second'].map(key => parts.find(part => part.type === key)!.value).join('');
    };
    if (local(input.ends_at) <= local(input.starts_at)) throw new ValidationError('period', 'Recurring periods must also end after they start in local time');
    const { frequency, interval, until } = input.recurrence;
    if (!['DAILY', 'WEEKLY'].includes(frequency) || !Number.isInteger(interval) || interval < 1 || interval > 52) {
      throw new ValidationError('recurrence');
    }
    if (end - start > 31 * 86400000) throw new ValidationError('period', 'Recurring blocks are limited to 31 days per occurrence');
    if (until != null && (!Number.isFinite(Date.parse(until)) || Date.parse(until) < start)) throw new ValidationError('recurrence.until', 'Must not precede starts_at');
  }
}
export function validateOccurrenceRange({ from, to }: BlockOccurrenceFilters): void {
  const start = Date.parse(from), end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 366 * 86400000) {
    throw new ValidationError('period', 'Use a positive query period of at most 366 days');
  }
}
export class ScheduleBlockService {
  constructor(private readonly repository: ScheduleBlockRepository) {}
  create(input: ScheduleBlockInput) { validateBlock(input); return this.repository.create(input); }
  update(id: string, input: Partial<ScheduleBlockInput>) { return this.repository.update(id, input); }
  occurrences(options: BlockOccurrenceFilters) { validateOccurrenceRange(options); return this.repository.occurrences(options); }
}

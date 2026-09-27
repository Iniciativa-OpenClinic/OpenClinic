import { ValidationError } from '@openclinic/core';
import type { ProcedureInput, ProcedureRepository } from '../../domain/procedure.js';

export class ProcedureService {
  constructor(private readonly repository: ProcedureRepository) {}

  private validate(input: Partial<ProcedureInput>): void {
    if (input.name !== undefined && !input.name.trim()) throw new ValidationError('name');
    for (const field of ['estimated_duration_minutes', 'return_after_days', 'minimum_interval_days'] as const) {
      const value = input[field];
      if (value != null && (!Number.isInteger(value) || value < (field === 'estimated_duration_minutes' ? 1 : 0) || value > 2147483647)) {
        throw new ValidationError(field);
      }
    }
    if (input.practitioner_ids && new Set(input.practitioner_ids).size !== input.practitioner_ids.length) {
      throw new ValidationError('practitioner_ids', 'Duplicate practitioner IDs');
    }
  }

  async create(input: ProcedureInput) {
    this.validate(input);
    return this.repository.create(input);
  }

  async update(id: string, input: Partial<ProcedureInput>) {
    this.validate(input);
    return this.repository.update(id, input);
  }
}

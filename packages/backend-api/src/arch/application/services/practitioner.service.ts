import { Cpf } from '@openclinic/core';
import type { PractitionerInput, PractitionerRepository } from '../../domain/practitioner.js';

/** Business validation shared by creation and partial updates. */
export class PractitionerService {
  constructor(private readonly repository: PractitionerRepository) {}

  private validate(input: Partial<PractitionerInput>): void {
    if (input.cpf != null) Cpf.create(input.cpf);
  }

  async create(input: PractitionerInput) {
    this.validate(input);
    return this.repository.create(input);
  }

  async update(id: string, input: Partial<PractitionerInput>) {
    this.validate(input);
    return this.repository.update(id, input);
  }
}

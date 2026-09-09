import type { IPractitionerRepository } from '../domain/clinical.repositories.js';
import type { PractitionerDTO } from '@openclinic/core';

export class ListPractitionersUseCase {
  constructor(private readonly practitionerRepo: IPractitionerRepository) {}

  async execute(tenantId?: string): Promise<PractitionerDTO[]> {
    return this.practitionerRepo.listActive(tenantId);
  }
}

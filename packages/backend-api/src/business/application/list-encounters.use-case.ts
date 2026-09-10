import type { IEncounterRepository } from '../domain/clinical.repositories.js';
import type { EncounterSummaryDTO } from '@openclinic/core';

export class ListEncountersUseCase {
  constructor(private readonly encounterRepo: IEncounterRepository) {}

  async execute(tenantId?: string): Promise<EncounterSummaryDTO[]> {
    return this.encounterRepo.listSummaries(tenantId);
  }
}

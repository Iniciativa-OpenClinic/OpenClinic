import type { IPatientRepository } from '../domain/clinical.repositories.js';
import type { PatientDTO } from '@openclinic/core';

export class ListPatientsUseCase {
  constructor(private readonly patientRepo: IPatientRepository) {}

  async execute(tenantId?: string): Promise<PatientDTO[]> {
    return this.patientRepo.listActive(tenantId);
  }
}

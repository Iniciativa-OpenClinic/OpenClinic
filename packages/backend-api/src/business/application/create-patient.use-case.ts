import { randomUUID } from 'node:crypto';
import type { IPatientRepository } from '../domain/clinical.repositories.js';
import type { CreatePatientDTO, PatientDTO } from '@openclinic/core';
import { ValidationError } from '@openclinic/core';

export class CreatePatientUseCase {
  constructor(private readonly patientRepo: IPatientRepository) {}

  async execute(data: CreatePatientDTO, tenantId: string): Promise<PatientDTO> {
    if (!data.full_name || typeof data.full_name !== 'string' || !data.full_name.trim()) {
      throw new ValidationError('Field full_name is required');
    }

    const patientId = randomUUID();
    return this.patientRepo.create({
      ...data,
      id: patientId,
      tenant_id: tenantId,
      full_name: data.full_name.trim(),
    });
  }
}

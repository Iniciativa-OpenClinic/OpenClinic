import { Cnpj, ValidationError } from '@openclinic/core';
import type { UnitInput, UnitRepository } from '../../domain/unit.js';

export class UnitService {
  constructor(private readonly repository: UnitRepository) {}

  private async validate(input: Partial<UnitInput>): Promise<void> {
    if (input.cnpj != null) Cnpj.create(input.cnpj);
    if (input.organization_id !== undefined && !await this.repository.organizationExists(input.organization_id)) {
      throw new ValidationError('organization_id', 'Organization not found in the current tenant');
    }
  }

  async create(input: UnitInput) {
    await this.validate(input);
    return this.repository.create(input);
  }

  async update(id: string, input: Partial<UnitInput>) {
    if (!await this.repository.getById(id)) return null;
    await this.validate(input);
    return this.repository.update(id, input);
  }
}
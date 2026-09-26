import { ValidationError } from '@openclinic/core';
import type { RoomInput, RoomRepository } from '../../domain/room.js';

export class RoomService {
  constructor(private readonly repository: RoomRepository) {}

  private validate(input: Partial<RoomInput>): void {
    if (input.name !== undefined && !input.name.trim()) throw new ValidationError('name');
    if (input.unit_id !== undefined && !input.unit_id.trim()) throw new ValidationError('unit_id');
    if (input.equipment?.some(item => !item.trim())) throw new ValidationError('equipment');
  }

  async create(input: RoomInput) {
    this.validate(input);
    return this.repository.create(input);
  }

  async update(id: string, input: Partial<RoomInput>) {
    this.validate(input);
    return this.repository.update(id, input);
  }
}

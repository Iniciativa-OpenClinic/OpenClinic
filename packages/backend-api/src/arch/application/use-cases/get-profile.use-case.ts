import { EntityNotFoundError, UserRole } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { UserProfileDTO } from '../../domain/dtos.js';

export class GetProfileUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(userId: string): Promise<UserProfileDTO> {
    const user = await this.uow.users.getById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId);
    }

    const roleName = user.role ?? UserRole.USER;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      display_name: user.display_name,
      job_title: user.job_title ?? null,
      role: roleName,
      is_active: user.is_active,
      tenant_id: user.tenant_id,
      last_access: user.last_access,
    };
  }
}

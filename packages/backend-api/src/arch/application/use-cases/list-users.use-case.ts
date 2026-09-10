import { UserRole } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';

export class ListUsersUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(skip = 0, limit = 100, requesterRole?: UserRole) {
    let users = await this.uow.users.listAll(skip, limit);
    if (requesterRole !== UserRole.OWNER) {
      users = users.filter((u) => u.role !== UserRole.OWNER);
    }
    const now = new Date();

    const usersWithLockStatus = await Promise.all(
      users.map(async (u) => {
        const emailLockout = await this.uow.lockouts.getByIdentifier(u.email);
        const usernameLockout = await this.uow.lockouts.getByIdentifier(u.username);

        const isLocked = Boolean(
          (emailLockout?.locked_until && new Date(emailLockout.locked_until) > now) ||
          (usernameLockout?.locked_until && new Date(usernameLockout.locked_until) > now)
        );

        return {
          id: u.id,
          username: u.username,
          email: u.email,
          cpf: u.cpf ?? null,
          full_name: u.full_name,
          display_name: u.display_name,
          job_title: u.job_title ?? null,
          role: u.role ?? UserRole.USER,
          is_active: u.is_active,
          is_tenant_owner: u.is_tenant_owner,
          tenant_id: u.tenant_id,
          is_locked: isLocked,
          last_access: u.last_access,
          created_at: u.created_at,
          updated_at: u.updated_at,
        };
      })
    );

    return usersWithLockStatus;
  }
}

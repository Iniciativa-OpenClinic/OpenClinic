import { EntityNotFoundError, ErrorCode, SupportedLocales, UserRole } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { UserGroupsResponseDTO, GroupListItemDTO } from '../../domain/dtos.js';

export class GetUserGroupsUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(userId: string): Promise<UserGroupsResponseDTO> {
    const user = await this.uow.users.getById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId, ErrorCode.USER_NOT_FOUND);
    }

    const allGroups = await this.uow.groups.findAllWithMemberCount(user.tenant_id ?? undefined);
    const userGroupEntities = await this.uow.groups.getUserGroups(userId);

    const userGroupIds = new Set(userGroupEntities.map((g) => g.id));

    const groups: GroupListItemDTO[] = allGroups
      .filter((g) => userGroupIds.has(g.id))
      .sort((a, b) => a.name.localeCompare(b.name, SupportedLocales.PT_BR, { sensitivity: 'base' }));

    const available_groups: GroupListItemDTO[] = allGroups
      .filter((g) => !userGroupIds.has(g.id) && g.is_active)
      .sort((a, b) => a.name.localeCompare(b.name, SupportedLocales.PT_BR, { sensitivity: 'base' }));

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        display_name: user.display_name,
        role: user.role ?? UserRole.USER,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      groups,
      available_groups,
    };
  }
}

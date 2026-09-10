import { EntityNotFoundError, ErrorCode, SupportedLocales, UserRole } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { GroupMembersResponseDTO, UserListItemDTO } from '../../domain/dtos.js';

export class GetGroupMembersUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(groupId: string): Promise<GroupMembersResponseDTO> {
    const group = await this.uow.groups.getById(groupId);
    if (!group) {
      throw new EntityNotFoundError('Grupo', groupId, ErrorCode.GROUP_NOT_FOUND);
    }

    const memberEntities = await this.uow.groups.getMembers(groupId);
    const allUsers = await this.uow.users.listAll(0, 1000);

    const memberIds = new Set(memberEntities.map((m) => m.id));

    const members: UserListItemDTO[] = memberEntities
      .map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        full_name: u.full_name,
        display_name: u.display_name,
        role: u.role ?? UserRole.USER,
        is_active: u.is_active,
        created_at: u.created_at,
        updated_at: u.updated_at,
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, SupportedLocales.PT_BR, { sensitivity: 'base' }));

    const available_users: UserListItemDTO[] = allUsers
      .filter((u) => !memberIds.has(u.id) && u.is_active)
      .map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        full_name: u.full_name,
        display_name: u.display_name,
        role: u.role ?? UserRole.USER,
        is_active: u.is_active,
        created_at: u.created_at,
        updated_at: u.updated_at,
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, SupportedLocales.PT_BR, { sensitivity: 'base' }));

    return {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        is_active: group.is_active,
        is_default: (group as any).is_default ?? false,
        member_count: members.length,
        tenant_id: group.tenant_id,
        created_at: group.created_at,
        updated_at: group.updated_at,
      },
      members,
      available_users,
    };
  }
}

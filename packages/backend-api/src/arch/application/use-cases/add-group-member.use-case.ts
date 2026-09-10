import { EntityNotFoundError, EntityAlreadyExistsError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { AuditStatus } from '../../../shared/domain/enums.js';

export class AddGroupMemberUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(groupId: string, userId: string, ipAddress?: string, username?: string): Promise<ActionResponseDTO<{ groupId: string; userId: string }>> {
    const group = await this.uow.groups.getById(groupId);
    if (!group) {
      throw new EntityNotFoundError('Group', groupId, ErrorCode.GROUP_NOT_FOUND);
    }

    const user = await this.uow.users.getById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId, ErrorCode.USER_NOT_FOUND);
    }

    const isMember = await this.uow.groups.isMember(groupId, userId);
    if (isMember) {
      throw new EntityAlreadyExistsError('Membership', 'user', user.username, ErrorCode.USER_ALREADY_IN_GROUP);
    }

    await this.uow.groups.addMember(groupId, userId);

    await this.uow.auditLogs.create({
      user_id: user.id,
      username: username ?? 'admin',
      action: 'group_member_added',
      resource: 'iam_user_groups',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
      details: { groupId, userId, groupName: group.name, userEmail: user.email },
    });

    logger.info({ groupId, userId }, 'User added to group');

    return {
      code: SuccessCode.GROUP_MEMBER_ADDED,
      message: getSuccessMessage(SuccessCode.GROUP_MEMBER_ADDED, SupportedLocales.PT_BR),
      data: { groupId, userId },
    };
  }
}

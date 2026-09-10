import { EntityNotFoundError, AccessDeniedError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { AuditStatus } from '../../../shared/domain/enums.js';

export class RemoveGroupMemberUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(groupId: string, userId: string, ipAddress?: string, username?: string): Promise<ActionResponseDTO<{ groupId: string; userId: string }>> {
    const group = await this.uow.groups.getById(groupId);
    if (!group) {
      throw new EntityNotFoundError('Group', groupId, ErrorCode.GROUP_NOT_FOUND);
    }

    if (group.is_default) {
      throw new AccessDeniedError(ErrorCode.DEFAULT_GROUP_MEMBER_IMMUTABLE);
    }

    const user = await this.uow.users.getById(userId);
    if (!user) {
      throw new EntityNotFoundError('User', userId, ErrorCode.USER_NOT_FOUND);
    }

    await this.uow.groups.removeMember(groupId, userId);

    await this.uow.auditLogs.create({
      user_id: user.id,
      username: username ?? 'admin',
      action: 'group_member_removed',
      resource: 'iam_user_groups',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
      details: { groupId, userId, groupName: group.name, userEmail: user.email },
    });

    logger.info({ groupId, userId }, 'User removed from group');

    return {
      code: SuccessCode.GROUP_MEMBER_REMOVED,
      message: getSuccessMessage(SuccessCode.GROUP_MEMBER_REMOVED, SupportedLocales.PT_BR),
      data: { groupId, userId },
    };
  }
}

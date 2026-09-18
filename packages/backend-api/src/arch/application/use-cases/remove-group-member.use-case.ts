import {
  EntityNotFoundError,
  AccessDeniedError,
  ErrorCode,
  SuccessCode,
  getSuccessMessage,
  logger,
  SupportedLocales,
  AUDIT_CONSTANTS,
  IpAddress,
  AuditStatus,
  AuditAction,
  AuditResource,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';

export class RemoveGroupMemberUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(groupId: string, userId: string, ipAddress?: string | IpAddress, username?: string): Promise<ActionResponseDTO<{ groupId: string; userId: string }>> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
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
      username: username ?? AUDIT_CONSTANTS.SYSTEM_OPERATOR,
      action: AuditAction.GROUP_MEMBER_REMOVED,
      resource: AuditResource.IAM_USER_GROUPS,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
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

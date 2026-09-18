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

export class DeleteGroupUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(id: string, ipAddress?: string | IpAddress, username?: string): Promise<ActionResponseDTO<{ id: string; name: string }>> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
    const existingGroup = await this.uow.groups.getById(id);
    if (!existingGroup) {
      throw new EntityNotFoundError('Group', id, ErrorCode.GROUP_NOT_FOUND);
    }

    if (existingGroup.is_default) {
      throw new AccessDeniedError(ErrorCode.DEFAULT_GROUP_IMMUTABLE);
    }

    const groupName = existingGroup.name;
    await this.uow.groups.delete(id);

    await this.uow.auditLogs.create({
      user_id: null,
      username: username ?? AUDIT_CONSTANTS.SYSTEM_OPERATOR,
      action: AuditAction.GROUP_DELETED,
      resource: AuditResource.IAM_GROUPS,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
      user_agent: null,
      details: { groupId: id, name: groupName },
    });

    logger.info({ groupId: id, name: groupName }, 'User group deleted');

    return {
      code: SuccessCode.GROUP_DELETED,
      message: getSuccessMessage(SuccessCode.GROUP_DELETED, SupportedLocales.PT_BR, { name: groupName }),
      data: {
        id,
        name: groupName,
      },
    };
  }
}

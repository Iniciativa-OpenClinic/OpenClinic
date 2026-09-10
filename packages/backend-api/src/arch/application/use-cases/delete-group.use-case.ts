import { EntityNotFoundError, AccessDeniedError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { AuditStatus } from '../../../shared/domain/enums.js';

export class DeleteGroupUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(id: string, ipAddress?: string, username?: string): Promise<ActionResponseDTO<{ id: string; name: string }>> {
    const existingGroup = await this.uow.groups.getById(id);
    if (!existingGroup) {
      throw new EntityNotFoundError('Grupo', id, ErrorCode.GROUP_NOT_FOUND);
    }

    if (existingGroup.is_default) {
      throw new AccessDeniedError(ErrorCode.DEFAULT_GROUP_IMMUTABLE);
    }

    const groupName = existingGroup.name;
    await this.uow.groups.delete(id);

    await this.uow.auditLogs.create({
      user_id: null,
      username: username ?? 'admin',
      action: 'group_deleted',
      resource: 'iam_groups',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
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

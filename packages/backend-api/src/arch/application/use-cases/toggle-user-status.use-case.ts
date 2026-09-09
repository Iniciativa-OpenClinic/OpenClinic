import { EntityNotFoundError, AccessDeniedError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { UserRole, AuditStatus } from '../../../shared/domain/enums.js';

export class ToggleUserStatusUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(creatorRole: UserRole, targetUserId: string, ipAddress?: string, creatorUserId?: string): Promise<ActionResponseDTO<{ id: string; is_active: boolean }>> {
    if (creatorUserId && creatorUserId === targetUserId) {
      throw new AccessDeniedError(ErrorCode.USER_CANNOT_DEACTIVATE_SELF);
    }

    const targetUser = await this.uow.users.getById(targetUserId);
    if (!targetUser) {
      throw new EntityNotFoundError('User', targetUserId);
    }

    const targetUserRole = targetUser.role;
    if (creatorRole !== UserRole.OWNER && targetUserRole === UserRole.OWNER) {
      throw new AccessDeniedError(ErrorCode.OWNER_IMMUTABLE);
    }

    const nextActiveState = !targetUser.is_active;

    const updated = await this.uow.users.update(targetUser.id, {
      is_active: nextActiveState,
    });

    if (!nextActiveState) {
      try {
        await this.uow.sessions.revokeAllByUser(targetUserId);
      } catch (err) {
        logger.warn({ targetUserId, err }, 'Failed to revoke sessions for deactivated user');
      }
    }

    try {
      await this.uow.auditLogs.create({
        user_id: targetUser.id,
        username: targetUser.username,
        action: nextActiveState ? 'user_activated' : 'user_deactivated',
        resource: 'iam_users',
        status: AuditStatus.SUCCESS,
        ip_address: ipAddress ?? null,
        user_agent: null,
      });
    } catch (err) {
      logger.warn({ targetUserId, err }, 'Failed to record audit log on user status toggle');
    }

    logger.info({ targetUserId, isActive: nextActiveState }, 'User status toggled');

    return {
      code: SuccessCode.USER_STATUS_TOGGLED,
      message: getSuccessMessage(SuccessCode.USER_STATUS_TOGGLED, SupportedLocales.PT_BR, {
        name: updated?.full_name ?? targetUser.full_name,
        status: nextActiveState ? 'ativado' : 'desativado',
      }),
      data: {
        id: updated?.id ?? targetUser.id,
        is_active: nextActiveState,
      },
    };
  }
}

import { EntityNotFoundError, AccessDeniedError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { UserRole, AuditStatus } from '../../../shared/domain/enums.js';

export class DeleteUserAdminUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(creatorRole: UserRole, creatorUserId: string, targetUserId: string, ipAddress?: string): Promise<ActionResponseDTO<{ id: string }>> {
    if (creatorUserId === targetUserId) {
      throw new AccessDeniedError(ErrorCode.USER_CANNOT_DELETE_SELF);
    }

    const targetUser = await this.uow.users.getById(targetUserId);
    if (!targetUser) {
      throw new EntityNotFoundError('User', targetUserId);
    }

    const targetUserRole = targetUser.role;
    if (creatorRole !== UserRole.OWNER && targetUserRole === UserRole.OWNER) {
      throw new AccessDeniedError(ErrorCode.OWNER_IMMUTABLE);
    }

    // Revoke sessions and clean lockouts
    await this.uow.sessions.revokeAllByUser(targetUserId);
    await this.uow.lockouts.reset(targetUser.email);
    await this.uow.lockouts.reset(targetUser.username);

    const deleted = await this.uow.users.delete(targetUserId);
    if (!deleted) {
      throw new EntityNotFoundError('User', targetUserId);
    }

    await this.uow.auditLogs.create({
      user_id: targetUserId,
      username: targetUser.username,
      action: 'user_deleted_by_admin',
      resource: 'iam_users',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
      details: {
        deleted_user: {
          email: targetUser.email,
          username: targetUser.username,
          full_name: targetUser.full_name,
          role: targetUserRole,
        },
      },
    });

    logger.info({ targetUserId, username: targetUser.username }, 'User deleted via admin panel');

    return {
      code: SuccessCode.USER_DELETED,
      message: getSuccessMessage(SuccessCode.USER_DELETED, SupportedLocales.PT_BR, {
        name: targetUser.full_name,
        username: targetUser.username,
      }),
      data: {
        id: targetUserId,
      },
    };
  }
}

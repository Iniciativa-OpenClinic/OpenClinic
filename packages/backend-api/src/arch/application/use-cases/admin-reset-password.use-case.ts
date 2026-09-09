import { hashPassword, ValidationError, EntityNotFoundError, AccessDeniedError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { UserRole, AuditStatus } from '../../../shared/domain/enums.js';

export class AdminResetPasswordUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(creatorRole: UserRole, targetUserId: string, newPassword: string, ipAddress?: string): Promise<ActionResponseDTO<{ id: string }>> {
    if (newPassword.length < 8) {
      throw new ValidationError('new_password', ErrorCode.PASSWORD_TOO_SHORT);
    }

    const targetUser = await this.uow.users.getById(targetUserId);
    if (!targetUser) {
      throw new EntityNotFoundError('User', targetUserId);
    }

    const targetUserRole = targetUser.role;
    if (creatorRole !== UserRole.OWNER && targetUserRole === UserRole.OWNER) {
      throw new AccessDeniedError(ErrorCode.OWNER_IMMUTABLE);
    }

    const newHash = await hashPassword(newPassword);
    await this.uow.users.update(targetUser.id, {
      hashed_password: newHash,
      require_password_change: false,
    });

    await this.uow.auditLogs.create({
      user_id: targetUser.id,
      username: targetUser.username,
      action: 'admin_reset_password_success',
      resource: 'iam_users',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
    });

    logger.info({ targetUserId }, 'User password reset by administrator');
    return {
      code: SuccessCode.PASSWORD_RESET_SUCCESS,
      message: getSuccessMessage(SuccessCode.PASSWORD_RESET_SUCCESS, SupportedLocales.PT_BR),
      data: {
        id: targetUserId,
      },
    };
  }
}

import { hashPassword, verifyPassword, AuthenticationError, ValidationError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { AuditStatus } from '../../../shared/domain/enums.js';

export class ChangePasswordUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(userId: string, currentPassword: string, newPassword: string, ipAddress?: string): Promise<ActionResponseDTO<{ id: string }>> {
    if (newPassword.length < 8) {
      throw new ValidationError('new_password', ErrorCode.PASSWORD_TOO_SHORT);
    }

    const user = await this.uow.users.getById(userId);
    if (!user || !user.hashed_password) {
      throw new AuthenticationError(ErrorCode.AUTH_FAILED);
    }

    const isMatch = await verifyPassword(user.hashed_password, currentPassword);
    if (!isMatch) {
      await this.uow.auditLogs.create({
        user_id: user.id,
        username: user.username,
        action: 'change_password_failed',
        resource: 'auth',
        status: AuditStatus.FAILURE,
        ip_address: ipAddress ?? null,
        user_agent: null,
      });
      throw new AuthenticationError(ErrorCode.INVALID_CURRENT_PASSWORD);
    }

    const newHash = await hashPassword(newPassword);
    await this.uow.users.update(user.id, {
      hashed_password: newHash,
      require_password_change: false,
    });

    await this.uow.auditLogs.create({
      user_id: user.id,
      username: user.username,
      action: 'change_password_success',
      resource: 'auth',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
    });

    logger.info({ userId: user.id }, 'User password changed successfully');
    return {
      code: SuccessCode.PASSWORD_CHANGED_SUCCESS,
      message: getSuccessMessage(SuccessCode.PASSWORD_CHANGED_SUCCESS, SupportedLocales.PT_BR),
      data: { id: user.id },
    };
  }
}

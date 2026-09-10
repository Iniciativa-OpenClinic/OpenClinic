import { hashPassword, AuthenticationError, ValidationError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { AuditStatus } from '../../../shared/domain/enums.js';

export class ResetPasswordUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(token: string, newPassword: string, ipAddress?: string): Promise<ActionResponseDTO<{ id: string }>> {
    if (newPassword.length < 8) {
      throw new ValidationError('new_password', ErrorCode.PASSWORD_TOO_SHORT);
    }

    const user = await this.uow.users.getByField('password_reset_token', token);
    if (!user || !user.password_reset_expires_at || user.password_reset_expires_at < new Date()) {
      throw new AuthenticationError(ErrorCode.TOKEN_INVALID);
    }

    const newHash = await hashPassword(newPassword);
    await this.uow.users.update(user.id, {
      hashed_password: newHash,
      password_reset_token: null,
      password_reset_expires_at: null,
      require_password_change: false,
    });

    await this.uow.auditLogs.create({
      user_id: user.id,
      username: user.username,
      action: 'reset_password_success',
      resource: 'auth',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
    });

    logger.info({ userId: user.id }, 'Password reset successfully via token');
    return {
      code: SuccessCode.PASSWORD_RESET_SUCCESS,
      message: getSuccessMessage(SuccessCode.PASSWORD_RESET_SUCCESS, SupportedLocales.PT_BR),
      data: { id: user.id },
    };
  }
}

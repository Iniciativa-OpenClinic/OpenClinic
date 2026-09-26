import {
  hashPassword,
  hashToken,
  AuthenticationError,
  ValidationError,
  ErrorCode,
  SuccessCode,
  getSuccessMessage,
  logger,
  SupportedLocales,
  IpAddress,
  AUTH_SECURITY_DEFAULTS,
  AuditStatus,
  AuditAction,
  AuditResource,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';

export class ResetPasswordUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(token: string, newPassword: string, ipAddress?: string | IpAddress): Promise<ActionResponseDTO<{ id: string }>> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
    const defaultApp = await this.uow.applications?.getDefaultApplication?.();
    const minPasswordLength = defaultApp?.defaultMinPasswordLength ?? AUTH_SECURITY_DEFAULTS.PASSWORD_MIN_LENGTH;
    if (newPassword.length < minPasswordLength) {
      throw new ValidationError('new_password', ErrorCode.PASSWORD_TOO_SHORT);
    }

    const tokenHash = hashToken(token);
    const user = await this.uow.users.getByField('password_reset_token', tokenHash);
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
      action: AuditAction.PASSWORD_RESET_SUCCESS,
      resource: AuditResource.AUTH,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
      user_agent: null,
    });

    await this.uow.sessions.revokeAllByUser(user.id);

    logger.info({ userId: user.id }, 'Password reset successfully via token');
    return {
      code: SuccessCode.PASSWORD_RESET_SUCCESS,
      message: getSuccessMessage(SuccessCode.PASSWORD_RESET_SUCCESS, SupportedLocales.PT_BR),
      data: { id: user.id },
    };
  }
}

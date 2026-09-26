import {
  hashPassword,
  verifyPassword,
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

export class ChangePasswordUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(userId: string, currentPassword: string, newPassword: string, ipAddress?: string | IpAddress): Promise<ActionResponseDTO<{ id: string }>> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
    const defaultApp = await this.uow.applications?.getDefaultApplication?.();
    const minPasswordLength = defaultApp?.defaultMinPasswordLength ?? AUTH_SECURITY_DEFAULTS.PASSWORD_MIN_LENGTH;
    if (newPassword.length < minPasswordLength) {
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
        action: AuditAction.PASSWORD_CHANGED_FAILED,
        resource: AuditResource.AUTH,
        status: AuditStatus.FAILURE,
        ip_address: validatedIp?.value ?? null,
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
      action: AuditAction.PASSWORD_CHANGED_SUCCESS,
      resource: AuditResource.AUTH,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
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

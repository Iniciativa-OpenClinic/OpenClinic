import { randomUUID } from 'node:crypto';
import {
  hashToken,
  SuccessCode,
  getSuccessMessage,
  logger,
  SupportedLocales,
  IpAddress,
  AUTH_SECURITY_DEFAULTS,
  TIME_CONSTANTS,
  AuditStatus,
  AuditAction,
  AuditResource,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';

export interface ForgotPasswordDataDTO {
  expires_in_minutes: number;
}

export class ForgotPasswordUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(identifier: string, ipAddress?: string | IpAddress): Promise<ActionResponseDTO<ForgotPasswordDataDTO>> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
    const defaultApp = await this.uow.applications?.getDefaultApplication?.();
    const expiresInMinutes = defaultApp?.defaultPasswordResetTokenTtlHours
      ? defaultApp.defaultPasswordResetTokenTtlHours * 60
      : AUTH_SECURITY_DEFAULTS.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES;

    const user = await this.uow.users.getByIdentifier(identifier.trim());

    if (!user) {
      // Return generic success to prevent user enumeration attacks
      return {
        code: SuccessCode.FORGOT_PASSWORD_SENT,
        message: getSuccessMessage(SuccessCode.FORGOT_PASSWORD_SENT, SupportedLocales.PT_BR),
        data: {
          expires_in_minutes: expiresInMinutes,
        },
      };
    }

    const resetToken = randomUUID();
    const resetTokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + expiresInMinutes * TIME_CONSTANTS.MS_PER_MINUTE);

    await this.uow.users.update(user.id, {
      password_reset_token: resetTokenHash,
      password_reset_expires_at: expiresAt,
    });

    await this.uow.auditLogs.create({
      user_id: user.id,
      username: user.username,
      action: AuditAction.FORGOT_PASSWORD_REQUESTED,
      resource: AuditResource.AUTH,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
      user_agent: null,
    });

    logger.info({ userId: user.id }, 'Password reset link generated');

    return {
      code: SuccessCode.FORGOT_PASSWORD_SENT,
      message: getSuccessMessage(SuccessCode.FORGOT_PASSWORD_SENT, SupportedLocales.PT_BR),
      data: {
        expires_in_minutes: expiresInMinutes,
      },
    };
  }
}

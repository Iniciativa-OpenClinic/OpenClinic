import { randomUUID } from 'node:crypto';
import { SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { AuditStatus } from '../../../shared/domain/enums.js';

export interface ForgotPasswordDataDTO {
  simulated_email?: string;
  reset_token?: string;
  expires_in_minutes: number;
}

export class ForgotPasswordUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(identifier: string, ipAddress?: string): Promise<ActionResponseDTO<ForgotPasswordDataDTO>> {
    const user = await this.uow.users.getByIdentifier(identifier.trim());

    if (!user) {
      // Retorna sucesso genérico para prevenção de enumeração de usuários
      return {
        code: SuccessCode.FORGOT_PASSWORD_SENT,
        message: getSuccessMessage(SuccessCode.FORGOT_PASSWORD_SENT, SupportedLocales.PT_BR),
        data: {
          expires_in_minutes: 30,
        },
      };
    }

    const resetToken = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60000); // 30 minutos

    await this.uow.users.update(user.id, {
      password_reset_token: resetToken,
      password_reset_expires_at: expiresAt,
    });

    await this.uow.auditLogs.create({
      user_id: user.id,
      username: user.username,
      action: 'forgot_password_requested',
      resource: 'auth',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
    });

    logger.info({ userId: user.id, email: user.email, resetToken }, '[EMAIL SIMULATION] Password reset link generated');

    return {
      code: SuccessCode.FORGOT_PASSWORD_SENT,
      message: getSuccessMessage(SuccessCode.FORGOT_PASSWORD_SENT, SupportedLocales.PT_BR),
      data: {
        simulated_email: user.email,
        reset_token: resetToken,
        expires_in_minutes: 30,
      },
    };
  }
}

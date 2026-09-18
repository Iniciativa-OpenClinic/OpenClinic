import {
  hashPassword,
  ValidationError,
  EntityNotFoundError,
  AccessDeniedError,
  ErrorCode,
  SuccessCode,
  getSuccessMessage,
  logger,
  SupportedLocales,
  IpAddress,
  AUTH_SECURITY_DEFAULTS,
  UserRole,
  AuditStatus,
  AuditAction,
  AuditResource,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';

export class AdminResetPasswordUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(creatorRole: UserRole, targetUserId: string, newPassword: string, ipAddress?: string | IpAddress, creatorTenantId?: string): Promise<ActionResponseDTO<{ id: string }>> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
    const defaultApp = await this.uow.applications?.getDefaultApplication?.();
    const minPasswordLength = defaultApp?.defaultMinPasswordLength ?? AUTH_SECURITY_DEFAULTS.PASSWORD_MIN_LENGTH;
    if (newPassword.length < minPasswordLength) {
      throw new ValidationError('new_password', ErrorCode.PASSWORD_TOO_SHORT);
    }

    const targetUser = await this.uow.users.getById(targetUserId);
    if (!targetUser) {
      throw new EntityNotFoundError('User', targetUserId);
    }

    if (creatorRole !== UserRole.OWNER) {
      if (creatorTenantId && targetUser.tenant_id && targetUser.tenant_id !== creatorTenantId) {
        throw new AccessDeniedError(ErrorCode.FORBIDDEN);
      }
      const targetUserRole = targetUser.role;
      if (targetUserRole === UserRole.OWNER) {
        throw new AccessDeniedError(ErrorCode.OWNER_IMMUTABLE);
      }
    }

    const newHash = await hashPassword(newPassword);
    await this.uow.users.update(targetUser.id, {
      hashed_password: newHash,
      password_reset_token: null,
      password_reset_expires_at: null,
      require_password_change: false,
    });

    await this.uow.sessions.revokeAllByUser(targetUser.id);

    await this.uow.auditLogs.create({
      user_id: targetUser.id,
      username: targetUser.username,
      action: AuditAction.ADMIN_RESET_PASSWORD_SUCCESS,
      resource: AuditResource.IAM_USERS,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
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

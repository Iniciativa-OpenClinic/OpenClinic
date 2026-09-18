import {
  EntityNotFoundError,
  AccessDeniedError,
  ErrorCode,
  SuccessCode,
  getSuccessMessage,
  logger,
  SupportedLocales,
  IpAddress,
  UserRole,
  AuditStatus,
  AuditAction,
  AuditResource,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';

export class UnlockUserUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(creatorRole: UserRole, targetUserId: string, ipAddress?: string | IpAddress, creatorTenantId?: string): Promise<ActionResponseDTO<{ id: string }>> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
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

    // Reset lockout attempts for both email and username
    await this.uow.lockouts.reset(targetUser.email);
    await this.uow.lockouts.reset(targetUser.username);

    await this.uow.auditLogs.create({
      user_id: targetUser.id,
      username: targetUser.username,
      action: AuditAction.USER_UNLOCKED_BY_ADMIN,
      resource: AuditResource.IAM_LOCKOUTS,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
      user_agent: null,
    });

    logger.info({ targetUserId, username: targetUser.username }, 'User account unlocked by administrator');

    return {
      code: SuccessCode.USER_UNLOCKED,
      message: getSuccessMessage(SuccessCode.USER_UNLOCKED, SupportedLocales.PT_BR),
      data: {
        id: targetUserId,
      },
    };
  }
}

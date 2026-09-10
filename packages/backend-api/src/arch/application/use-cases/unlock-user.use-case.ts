import { EntityNotFoundError, AccessDeniedError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { UserRole, AuditStatus } from '../../../shared/domain/enums.js';

export class UnlockUserUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(creatorRole: UserRole, targetUserId: string, ipAddress?: string): Promise<ActionResponseDTO<{ id: string }>> {
    const targetUser = await this.uow.users.getById(targetUserId);
    if (!targetUser) {
      throw new EntityNotFoundError('User', targetUserId);
    }

    const targetUserRole = targetUser.role;
    if (creatorRole !== UserRole.OWNER && targetUserRole === UserRole.OWNER) {
      throw new AccessDeniedError(ErrorCode.OWNER_IMMUTABLE);
    }

    // Reset lockout attempts for both email and username
    await this.uow.lockouts.reset(targetUser.email);
    await this.uow.lockouts.reset(targetUser.username);

    await this.uow.auditLogs.create({
      user_id: targetUser.id,
      username: targetUser.username,
      action: 'user_unlocked_by_admin',
      resource: 'iam_lockouts',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
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

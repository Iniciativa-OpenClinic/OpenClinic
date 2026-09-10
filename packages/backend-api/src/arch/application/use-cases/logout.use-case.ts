import { hashToken, logger } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import { AuditStatus } from '../../../shared/domain/enums.js';

export class LogoutUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      const session = await this.uow.sessions.findByTokenHash(tokenHash);
      if (session) {
        await this.uow.sessions.revoke(session.id);
      }
    } else {
      await this.uow.sessions.revokeAllByUser(userId);
    }

    await this.uow.auditLogs.create({ user_id: userId, username: null, action: 'logout', resource: 'auth', status: AuditStatus.SUCCESS, ip_address: null, user_agent: null });

    logger.info({ userId }, 'User logged out');
  }
}

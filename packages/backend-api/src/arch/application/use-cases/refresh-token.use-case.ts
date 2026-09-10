import { hashToken, createAccessToken, AuthenticationError, ErrorCode, logger, UserRole } from '@openclinic/core';
import type { JwtConfig } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { RefreshResponseDTO } from '../../domain/dtos.js';
import { randomUUID } from 'node:crypto';

export class RefreshTokenUseCase {
  constructor(
    private readonly uow: IAMUnitOfWork,
    private readonly jwtConfig: JwtConfig,
  ) {}

  async execute(refreshToken: string): Promise<RefreshResponseDTO> {
    const tokenHash = hashToken(refreshToken);

    // 1. Find existing session
    const session = await this.uow.sessions.findByTokenHash(tokenHash);
    if (!session || session.revoked_at || session.expires_at < new Date()) {
      throw new AuthenticationError(ErrorCode.TOKEN_INVALID);
    }

    // 2. Get user
    const user = await this.uow.users.getById(session.user_id);
    if (!user || !user.is_active) {
      await this.uow.sessions.revoke(session.id);
      throw new AuthenticationError(ErrorCode.USER_DISABLED);
    }

    // 3. Revoke old session (atomic rotation)
    await this.uow.sessions.revoke(session.id);

    // 4. Create new tokens
    const roleName = user.role ?? UserRole.USER;
    const tokenData = { sub: user.id, role: roleName, email: user.email, ...(user.tenant_id ? { tenant_id: user.tenant_id } : {}) };

    const newAccessToken = createAccessToken(tokenData, this.jwtConfig);
    const newRefreshToken = randomUUID() + '-' + randomUUID();
    const newRefreshHash = hashToken(newRefreshToken);

    const expireDays = this.jwtConfig.refreshTokenExpireDays ?? 7;
    await this.uow.sessions.create({ user_id: user.id, token_hash: newRefreshHash, user_agent: session.user_agent, ip_address: session.ip_address, expires_at: new Date(Date.now() + expireDays * 86400000), revoked_at: null });

    logger.info({ userId: user.id }, 'Token refreshed successfully');

    return { access_token: newAccessToken, refresh_token: newRefreshToken, token_type: 'bearer' };
  }
}

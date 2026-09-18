import {
  hashToken,
  createAccessToken,
  AuthenticationError,
  ErrorCode,
  logger,
  UserRole,
  AUTH_SECURITY_DEFAULTS,
  TIME_CONSTANTS,
  IpAddress,
} from '@openclinic/core';
import type { JwtConfig } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { RefreshResponseDTO } from '../../domain/dtos.js';
import { randomUUID } from 'node:crypto';

export class RefreshTokenUseCase {
  constructor(
    private readonly uow: IAMUnitOfWork,
    private readonly jwtConfig: JwtConfig,
  ) {}

  async execute(refreshToken: string, ipAddress?: string | IpAddress, userAgent?: string): Promise<RefreshResponseDTO> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
    const tokenHash = hashToken(refreshToken);

    const newRefreshToken = randomUUID() + '-' + randomUUID();
    const newRefreshHash = hashToken(newRefreshToken);
    const expireDays = this.jwtConfig.refreshTokenExpireDays ?? AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_EXPIRE_DAYS;

    // 1. Atomic compare-and-swap rotation: marks old session revoked and creates new session within the same atomic boundary
    const rotationResult = await this.uow.sessions.rotate(tokenHash, {
      token_hash: newRefreshHash,
      user_agent: userAgent ?? null,
      ip_address: validatedIp?.value ?? null,
      expires_at: new Date(Date.now() + expireDays * TIME_CONSTANTS.MS_PER_DAY),
      revoked_at: null,
    });

    if (!rotationResult) {
      // Refresh token could not be rotated: check if session existed and was already revoked (Reuse Detection)
      const existingSession = await this.uow.sessions.findAnyByTokenHash(tokenHash);
      if (existingSession) {
        await this.uow.sessions.revokeAllByUser(existingSession.user_id);
        logger.warn({ userId: existingSession.user_id }, 'Malicious refresh token reuse detected; all sessions revoked');
      }
      throw new AuthenticationError(ErrorCode.TOKEN_INVALID);
    }

    const { oldSession, newSession } = rotationResult;

    if (oldSession.expires_at < new Date()) {
      await this.uow.sessions.revoke(newSession.id);
      throw new AuthenticationError(ErrorCode.TOKEN_INVALID);
    }

    // 2. Validate user status
    const user = await this.uow.users.getById(oldSession.user_id);
    if (!user || !user.is_active) {
      await this.uow.sessions.revoke(newSession.id);
      throw new AuthenticationError(ErrorCode.USER_DISABLED);
    }

    // 3. Verify session liveness: verify that during asynchronous operations,
    // a concurrent token reuse detection or admin revocation did not revoke this user's sessions.
    const activeCheck = await this.uow.sessions.findById(newSession.id);
    if (!activeCheck || activeCheck.revoked_at !== null) {
      throw new AuthenticationError(ErrorCode.TOKEN_INVALID);
    }

    // 4. Create new access token bound to the new session
    const roleName = user.role ?? UserRole.USER;
    const tokenData = {
      sub: user.id,
      role: roleName,
      email: user.email,
      sid: newSession.id,
      ...(user.tenant_id ? { tenant_id: user.tenant_id } : {}),
    };

    const newAccessToken = createAccessToken(tokenData, this.jwtConfig);

    logger.info({ userId: user.id, sessionId: newSession.id }, 'Token refreshed successfully');

    return { access_token: newAccessToken, refresh_token: newRefreshToken, token_type: 'bearer' };
  }
}

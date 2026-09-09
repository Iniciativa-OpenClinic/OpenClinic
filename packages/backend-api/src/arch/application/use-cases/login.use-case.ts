import { hashToken, verifyPassword, createAccessToken, AuthenticationError, BruteForceError, ErrorCode, logger, UserRole } from '@openclinic/core';
import type { JwtConfig } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { LoginResponseDTO, UserProfileDTO } from '../../domain/dtos.js';
import { AuditStatus } from '../../../shared/domain/enums.js';
import { randomUUID } from 'node:crypto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export class LoginUseCase {
  constructor(
    private readonly uow: IAMUnitOfWork,
    private readonly jwtConfig: JwtConfig,
  ) {}

  async execute(identifier: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResponseDTO> {
    const trimmedIdentifier = identifier.trim();

    // 1. Brute force protection
    const lockout = await this.uow.lockouts.getByIdentifier(trimmedIdentifier);
    if (lockout?.locked_until && lockout.locked_until > new Date()) {
      const remainingMs = lockout.locked_until.getTime() - Date.now();
      throw new BruteForceError(Math.ceil(remainingMs / 60000));
    }

    // 2. Find user
    const user = await this.uow.users.getByIdentifier(trimmedIdentifier);

    // 3. Validate credentials
    if (!user || !user.hashed_password || !(await verifyPassword(user.hashed_password, password))) {
      const currentAttempts = (lockout?.attempt_count ?? 0) + 1;
      const lockedUntil = currentAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000) : null;
      await this.uow.lockouts.upsert(trimmedIdentifier, currentAttempts, lockedUntil);
      await this.uow.auditLogs.create({ user_id: user?.id ?? null, username: trimmedIdentifier, action: 'login', resource: 'auth', status: AuditStatus.FAILURE, ip_address: ipAddress ?? null, user_agent: userAgent ?? null });
      throw new AuthenticationError(ErrorCode.AUTH_FAILED);
    }

    if (!user.is_active) {
      throw new AuthenticationError(ErrorCode.USER_DISABLED);
    }

    // 4. Reset lockout on success
    await this.uow.lockouts.reset(trimmedIdentifier);

    // 5. Update access count
    await this.uow.users.update(user.id, { access_count: (user.access_count ?? 0) + 1, last_access: new Date() });

    // 6. Generate tokens
    const roleName = user.role ?? UserRole.USER;
    const tokenData = { sub: user.id, role: roleName, email: user.email, ...(user.tenant_id ? { tenant_id: user.tenant_id } : {}) };

    const accessToken = createAccessToken(tokenData, this.jwtConfig);
    const refreshToken = randomUUID() + '-' + randomUUID();
    const refreshTokenHash = hashToken(refreshToken);

    const expireDays = this.jwtConfig.refreshTokenExpireDays ?? 7;
    await this.uow.sessions.create({ user_id: user.id, token_hash: refreshTokenHash, user_agent: userAgent ?? null, ip_address: ipAddress ?? null, expires_at: new Date(Date.now() + expireDays * 86400000), revoked_at: null });

    // 7. Audit log
    await this.uow.auditLogs.create({ user_id: user.id, username: user.username, action: 'login', resource: 'auth', status: AuditStatus.SUCCESS, ip_address: ipAddress ?? null, user_agent: userAgent ?? null });

    logger.info({ userId: user.id, username: user.username }, 'User logged in successfully');

    const profile: UserProfileDTO = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      display_name: user.display_name,
      job_title: user.job_title ?? null,
      role: roleName,
      is_active: user.is_active,
      tenant_id: user.tenant_id,
      last_access: user.last_access,
    };

    return { access_token: accessToken, refresh_token: refreshToken, token_type: 'bearer', user: profile };
  }
}

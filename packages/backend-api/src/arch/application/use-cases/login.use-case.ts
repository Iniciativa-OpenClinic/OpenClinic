import {
  hashToken,
  verifyPassword,
  createAccessToken,
  AuthenticationError,
  BruteForceError,
  ErrorCode,
  logger,
  UserRole,
  AUTH_SECURITY_DEFAULTS,
  TIME_CONSTANTS,
  IpAddress,
  AuditStatus,
  AuditAction,
  AuditResource,
} from '@openclinic/core';
import type { JwtConfig } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { LoginResponseDTO, UserProfileDTO } from '../../domain/dtos.js';
import { randomUUID } from 'node:crypto';

export class LoginUseCase {
  constructor(
    private readonly uow: IAMUnitOfWork,
    private readonly jwtConfig: JwtConfig,
  ) {}

  async execute(identifier: string, password: string, ipAddress?: string | IpAddress, userAgent?: string): Promise<LoginResponseDTO> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
    const trimmedIdentifier = identifier.trim();
    const cleanDigits = trimmedIdentifier.replace(/\D/g, '');
    const normalizedIdentifier = (cleanDigits.length === 11 && !trimmedIdentifier.includes('@'))
      ? cleanDigits
      : trimmedIdentifier.toLowerCase();

    // 0. Load platform application security parameters (Owner configurable with canonical fallbacks)
    const defaultApp = await this.uow.applications?.getDefaultApplication();
    const maxAttempts = defaultApp?.defaultMaxLoginAttempts ?? AUTH_SECURITY_DEFAULTS.LOCKOUT_MAX_ATTEMPTS;
    const lockoutDurationMinutes = defaultApp?.defaultLockoutDurationMinutes ?? AUTH_SECURITY_DEFAULTS.LOCKOUT_DURATION_MINUTES;

    // 1. Brute force protection
    const lockout = await this.uow.lockouts.getByIdentifier(normalizedIdentifier);
    if (lockout?.locked_until && lockout.locked_until > new Date()) {
      const remainingMs = lockout.locked_until.getTime() - Date.now();
      throw new BruteForceError(Math.ceil(remainingMs / TIME_CONSTANTS.MS_PER_MINUTE));
    }

    // 2. Find user
    const user = await this.uow.users.getByIdentifier(normalizedIdentifier);

    // 3. Validate credentials (constant time verification to prevent timing-based user enumeration)
    const hashToVerify = user?.hashed_password ?? AUTH_SECURITY_DEFAULTS.DUMMY_ARGON2_HASH;
    const isPasswordValid = await verifyPassword(hashToVerify, password);

    if (!user || !user.hashed_password || !isPasswordValid) {
      const currentAttempts = (lockout?.attempt_count ?? 0) + 1;
      const lockedUntil = currentAttempts >= maxAttempts ? new Date(Date.now() + lockoutDurationMinutes * TIME_CONSTANTS.MS_PER_MINUTE) : null;
      await this.uow.lockouts.upsert(normalizedIdentifier, currentAttempts, lockedUntil);
      await this.uow.auditLogs.create({
        user_id: user?.id ?? null,
        username: normalizedIdentifier,
        action: AuditAction.LOGIN,
        resource: AuditResource.AUTH,
        status: AuditStatus.FAILURE,
        ip_address: validatedIp?.value ?? null,
        user_agent: userAgent ?? null,
      });
      throw new AuthenticationError(ErrorCode.AUTH_FAILED);
    }

    if (!user.is_active) {
      throw new AuthenticationError(ErrorCode.USER_DISABLED);
    }

    // 4. Reset lockout on success
    await this.uow.lockouts.reset(normalizedIdentifier);

    // 5. Update access count
    await this.uow.users.update(user.id, { access_count: (user.access_count ?? 0) + 1, last_access: new Date() });

    // 6. Generate tokens and create active session
    const expireDays = this.jwtConfig.refreshTokenExpireDays ?? AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_EXPIRE_DAYS;
    const refreshToken = randomUUID() + '-' + randomUUID();
    const refreshTokenHash = hashToken(refreshToken);

    const session = await this.uow.sessions.create({
      user_id: user.id,
      token_hash: refreshTokenHash,
      user_agent: userAgent ?? null,
      ip_address: validatedIp?.value ?? null,
      expires_at: new Date(Date.now() + expireDays * TIME_CONSTANTS.MS_PER_DAY),
      revoked_at: null,
    });

    const roleName = user.role ?? UserRole.USER;
    const tokenData = {
      sub: user.id,
      role: roleName,
      email: user.email,
      sid: session.id,
      ...(user.tenant_id ? { tenant_id: user.tenant_id } : {}),
    };

    const accessToken = createAccessToken(tokenData, this.jwtConfig);

    // 7. Audit log
    await this.uow.auditLogs.create({
      user_id: user.id,
      username: user.username,
      action: AuditAction.LOGIN,
      resource: AuditResource.AUTH,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
      user_agent: userAgent ?? null,
    });

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

    return { access_token: accessToken, refresh_token: refreshToken, token_type: AUTH_SECURITY_DEFAULTS.TOKEN_TYPE_BEARER, user: profile };
  }
}

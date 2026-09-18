import {
  hashPassword,
  EntityAlreadyExistsError,
  ErrorCode,
  logger,
  IpAddress,
  UserRole,
  AuditStatus,
  AuditAction,
  AuditResource,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { RegisterRequestDTO, UserProfileDTO } from '../../domain/dtos.js';

export class RegisterUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(data: RegisterRequestDTO, ipAddress?: string | IpAddress): Promise<UserProfileDTO> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
    // 1. Check uniqueness
    const existingEmail = await this.uow.users.getByEmail(data.email);
    if (existingEmail) {
      throw new EntityAlreadyExistsError('User', 'email', data.email, ErrorCode.USER_EMAIL_EXISTS);
    }

    const existingUsername = await this.uow.users.getByIdentifier(data.username);
    if (existingUsername) {
      throw new EntityAlreadyExistsError('User', 'username', data.username, ErrorCode.USER_USERNAME_EXISTS);
    }

    // 2. Get default tenant
    const defaultTenant = await this.uow.tenants?.getDefaultTenant();
    const tenantId = data.tenant_id ?? defaultTenant?.id ?? null;

    // 3. Hash password and create user
    const hashedPassword = await hashPassword(data.password);
    const user = await this.uow.users.create({
      email: data.email,
      username: data.username,
      hashed_password: hashedPassword,
      full_name: data.full_name,
      display_name: data.display_name ?? data.full_name,
      role: UserRole.USER,
      tenant_id: tenantId,
      is_active: true,
      is_tenant_owner: false,
    });

    // 4. Automatically bind to the default system group (is_default = true)
    try {
      const defaultGroup = await this.uow.groups.getDefaultGroup(tenantId ?? undefined);
      if (defaultGroup) {
        await this.uow.groups.addMember(defaultGroup.id, user.id);
      }
    } catch (grpErr) {
      logger.warn({ error: grpErr, userId: user.id }, 'Could not auto-link registered user to default group');
    }

    // 5. Audit log
    await this.uow.auditLogs.create({
      user_id: user.id,
      username: user.username,
      action: AuditAction.REGISTER,
      resource: AuditResource.AUTH,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
      user_agent: null,
    });

    logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

    return { id: user.id, username: user.username, email: user.email, full_name: user.full_name, display_name: user.display_name, role: UserRole.USER, is_active: true, tenant_id: user.tenant_id, last_access: null };
  }
}

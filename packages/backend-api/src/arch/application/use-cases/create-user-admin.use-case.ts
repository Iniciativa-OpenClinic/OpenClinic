import {
  hashPassword,
  ValidationError,
  EntityAlreadyExistsError,
  AccessDeniedError,
  ErrorCode,
  SuccessCode,
  getSuccessMessage,
  logger,
  SupportedLocales,
  Cpf,
  IpAddress,
  AUTH_SECURITY_DEFAULTS,
  UserRole,
  AuditStatus,
  AuditAction,
  AuditResource,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';

export interface CreateUserInputDTO {
  email: string;
  username: string;
  cpf?: string | null;
  full_name: string;
  display_name?: string | null;
  job_title?: string | null;
  password: string;
  role: UserRole;
  is_active?: boolean;
  tenant_id?: string | null;
}

export interface CreatedUserDataDTO {
  id: string;
  email: string;
  username: string;
  cpf?: string | null;
  full_name: string;
  display_name: string;
  job_title?: string | null;
  role: UserRole;
  is_active: boolean;
}

export class CreateUserAdminUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(creatorRole: UserRole, input: CreateUserInputDTO, ipAddress?: string | IpAddress, creatorTenantId?: string): Promise<ActionResponseDTO<CreatedUserDataDTO>> {
    const validatedIp = ipAddress instanceof IpAddress ? ipAddress : IpAddress.createOptional(ipAddress);
    if (creatorRole !== UserRole.OWNER && input.role === UserRole.OWNER) {
      throw new AccessDeniedError(ErrorCode.CANNOT_PROMOTE_TO_OWNER);
    }

    const defaultApp = await this.uow.applications?.getDefaultApplication?.();
    const minPasswordLength = defaultApp?.defaultMinPasswordLength ?? AUTH_SECURITY_DEFAULTS.PASSWORD_MIN_LENGTH;

    if (input.password.length < minPasswordLength) {
      throw new ValidationError('password', ErrorCode.PASSWORD_TOO_SHORT);
    }

    const existingEmail = await this.uow.users.getByEmail(input.email.trim().toLowerCase());
    if (existingEmail) {
      throw new EntityAlreadyExistsError('User', 'email', input.email, ErrorCode.USER_EMAIL_EXISTS);
    }

    const existingUser = await this.uow.users.getByField('username', input.username.trim());
    if (existingUser) {
      throw new EntityAlreadyExistsError('User', 'username', input.username, ErrorCode.USER_USERNAME_EXISTS);
    }

    let cleanedCpf: string | null = null;
    if (input.cpf) {
      cleanedCpf = Cpf.clean(input.cpf);
      if (!Cpf.isValid(cleanedCpf)) {
        throw new ValidationError('cpf', ErrorCode.VALIDATION_ERROR);
      }
      const existingCpf = await this.uow.users.getByField('cpf', cleanedCpf);
      if (existingCpf) {
        throw new EntityAlreadyExistsError('User', 'cpf', input.cpf, ErrorCode.ALREADY_EXISTS);
      }
    }

    if (!Object.values(UserRole).includes(input.role)) {
      throw new ValidationError('role', ErrorCode.ROLE_NOT_FOUND, { role: input.role });
    }

    const hashedPassword = await hashPassword(input.password);

    const defaultTenant = await this.uow.tenants?.getDefaultTenant();
    const tenantId = creatorRole === UserRole.OWNER
      ? (input.tenant_id ?? defaultTenant?.id ?? null)
      : (creatorTenantId ?? defaultTenant?.id ?? null);

    const newUser = await this.uow.users.create({
      email: input.email.trim().toLowerCase(),
      username: input.username.trim(),
      cpf: cleanedCpf,
      full_name: input.full_name.trim(),
      display_name: input.display_name?.trim() || input.full_name.trim(),
      job_title: input.job_title?.trim() || null,
      hashed_password: hashedPassword,
      role: input.role,
      tenant_id: tenantId,
      is_active: input.is_active !== undefined ? input.is_active : true,
      is_tenant_owner: input.role === UserRole.OWNER,
    });

    // Automatically bind to the default system group (is_default = true)
    try {
      const defaultGroup = await this.uow.groups.getDefaultGroup(tenantId ?? undefined);
      if (defaultGroup) {
        await this.uow.groups.addMember(defaultGroup.id, newUser.id);
      }
    } catch (grpErr) {
      logger.warn({ error: grpErr, userId: newUser.id }, 'Could not auto-link user to default group');
    }

    await this.uow.auditLogs.create({
      user_id: newUser.id,
      username: newUser.username,
      action: AuditAction.USER_CREATED_BY_ADMIN,
      resource: AuditResource.IAM_USERS,
      status: AuditStatus.SUCCESS,
      ip_address: validatedIp?.value ?? null,
      user_agent: null,
      details: { role: input.role, tenant_id: tenantId, job_title: input.job_title, cpf: cleanedCpf },
      tenant_id: tenantId,
    });

    logger.info({ userId: newUser.id, role: input.role }, 'User created via admin panel');

    return {
      code: SuccessCode.USER_CREATED,
      message: getSuccessMessage(SuccessCode.USER_CREATED, SupportedLocales.PT_BR),
      data: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        cpf: newUser.cpf ?? null,
        full_name: newUser.full_name,
        display_name: newUser.display_name,
        job_title: newUser.job_title,
        role: newUser.role,
        is_active: newUser.is_active,
      },
    };
  }
}

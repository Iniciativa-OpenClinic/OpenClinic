import {
  ValidationError,
  EntityNotFoundError,
  EntityAlreadyExistsError,
  AccessDeniedError,
  ErrorCode,
  SuccessCode,
  getSuccessMessage,
  logger,
  SupportedLocales,
  Cpf,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { UserRole, AuditStatus, ROLE_HIERARCHY } from '@openclinic/core';

export interface UpdateUserInputDTO {
  email: string;
  username: string;
  cpf?: string | null;
  full_name: string;
  display_name?: string | null;
  job_title?: string | null;
  role: UserRole;
  is_active?: boolean;
}

export interface UpdatedUserDataDTO {
  id: string;
  email: string;
  username: string;
  cpf?: string | null;
  full_name: string;
  display_name: string | null;
  job_title?: string | null;
  role: UserRole;
  is_active: boolean;
  is_tenant_owner: boolean;
}

export class UpdateUserAdminUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(creatorRole: UserRole, targetUserId: string, input: UpdateUserInputDTO, ipAddress?: string): Promise<ActionResponseDTO<UpdatedUserDataDTO>> {
    const targetUser = await this.uow.users.getById(targetUserId);
    if (!targetUser) {
      throw new EntityNotFoundError('User', targetUserId);
    }

    const currentRole = targetUser.role;
    if (creatorRole !== UserRole.OWNER) {
      if (currentRole === UserRole.OWNER) {
        throw new AccessDeniedError(ErrorCode.OWNER_IMMUTABLE);
      }
      if (input.role === UserRole.OWNER) {
        throw new AccessDeniedError(ErrorCode.CANNOT_PROMOTE_TO_OWNER);
      }
    }

    const trimmedEmail = input.email.trim().toLowerCase();
    const trimmedUsername = input.username.trim();
    const trimmedFullName = input.full_name.trim();

    if (!trimmedEmail || !trimmedUsername || !trimmedFullName) {
      throw new ValidationError('fields', ErrorCode.REQUIRED_FIELDS_MISSING);
    }

    // Check email collision
    if (trimmedEmail !== targetUser.email.toLowerCase()) {
      const existingEmail = await this.uow.users.getByEmail(trimmedEmail);
      if (existingEmail && existingEmail.id !== targetUserId) {
        throw new EntityAlreadyExistsError('User', 'email', input.email, ErrorCode.USER_EMAIL_EXISTS);
      }
    }

    // Check username collision
    if (trimmedUsername !== targetUser.username) {
      const existingUsername = await this.uow.users.getByField('username', trimmedUsername);
      if (existingUsername && existingUsername.id !== targetUserId) {
        throw new EntityAlreadyExistsError('User', 'username', input.username, ErrorCode.USER_USERNAME_EXISTS);
      }
    }

    let cleanedCpf: string | null | undefined = undefined;
    if (input.cpf !== undefined) {
      if (input.cpf) {
        cleanedCpf = Cpf.clean(input.cpf);
        if (!Cpf.isValid(cleanedCpf)) {
          throw new ValidationError('cpf', ErrorCode.VALIDATION_ERROR);
        }
        const existingCpf = await this.uow.users.getByField('cpf', cleanedCpf);
        if (existingCpf && existingCpf.id !== targetUserId) {
          throw new EntityAlreadyExistsError('User', 'cpf', input.cpf, ErrorCode.ALREADY_EXISTS);
        }
      } else {
        cleanedCpf = null;
      }
    }

    if (!Object.values(UserRole).includes(input.role)) {
      throw new ValidationError('role', ErrorCode.ROLE_NOT_FOUND, { role: input.role });
    }

    const updatedUser = await this.uow.users.update(targetUserId, {
      email: trimmedEmail,
      username: trimmedUsername,
      full_name: trimmedFullName,
      display_name: input.display_name !== undefined ? (input.display_name?.trim() || trimmedFullName) : targetUser.display_name,
      job_title: input.job_title !== undefined ? (input.job_title?.trim() || null) : targetUser.job_title,
      role: input.role,
      is_tenant_owner: input.role === UserRole.OWNER,
      ...(cleanedCpf !== undefined ? { cpf: cleanedCpf } : {}),
      ...(typeof input.is_active === 'boolean' ? { is_active: input.is_active } : {}),
    });

    // Role Downgrade Purge: revoke direct permissions on resources requiring higher roles
    if (ROLE_HIERARCHY[input.role] < ROLE_HIERARCHY[currentRole]) {
      const userPerms = await this.uow.permissions.listByUserId(targetUserId);
      if (userPerms && userPerms.length > 0 && this.uow.resources) {
        const allResources = await this.uow.resources.listAll(1000);
        const resMap = new Map<string, any>();
        for (const r of allResources) {
          resMap.set(r.id, r);
        }
        const newLevel = ROLE_HIERARCHY[input.role] ?? 1;
        for (const p of userPerms) {
          const res = resMap.get(p.resource_id);
          if (res) {
            const reqLevel = ROLE_HIERARCHY[res.min_role as UserRole] ?? 1;
            if (newLevel < reqLevel) {
              await this.uow.permissions.deleteById(p.id);
            }
          }
        }
      }
    }

    await this.uow.auditLogs.create({
      user_id: updatedUser.id,
      username: updatedUser.username,
      action: 'user_updated_by_admin',
      resource: 'iam_users',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
      details: {
        previous: { email: targetUser.email, username: targetUser.username, role: currentRole, job_title: targetUser.job_title },
        current: { email: updatedUser.email, username: updatedUser.username, role: input.role, job_title: updatedUser.job_title },
      },
    });

    logger.info({ userId: updatedUser.id, role: input.role }, 'User updated via admin panel');

    return {
      code: SuccessCode.USER_UPDATED,
      message: getSuccessMessage(SuccessCode.USER_UPDATED, SupportedLocales.PT_BR),
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        cpf: updatedUser.cpf ?? null,
        full_name: updatedUser.full_name,
        display_name: updatedUser.display_name,
        job_title: updatedUser.job_title,
        role: updatedUser.role,
        is_active: updatedUser.is_active,
        is_tenant_owner: updatedUser.is_tenant_owner,
      },
    };
  }
}

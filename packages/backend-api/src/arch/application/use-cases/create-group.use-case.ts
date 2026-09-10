import { EntityAlreadyExistsError, ValidationError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO, CreateGroupDTO, GroupListItemDTO } from '../../domain/dtos.js';
import { AuditStatus } from '../../../shared/domain/enums.js';

export class CreateGroupUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(input: CreateGroupDTO, ipAddress?: string, username?: string): Promise<ActionResponseDTO<GroupListItemDTO>> {
    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      throw new ValidationError('name', ErrorCode.REQUIRED_FIELDS_MISSING);
    }

    const trimmedDesc = input.description?.trim();
    if (!trimmedDesc) {
      throw new ValidationError('description', ErrorCode.REQUIRED_FIELDS_MISSING);
    }

    const defaultTenant = await this.uow.tenants?.getDefaultTenant();
    const tenantId = input.tenant_id ?? defaultTenant?.id ?? null;

    const existingGroup = await this.uow.groups.findByName(trimmedName, tenantId ?? undefined);
    if (existingGroup) {
      throw new EntityAlreadyExistsError('Grupo', 'nome', trimmedName, ErrorCode.GROUP_NAME_EXISTS);
    }

    const newGroup = await this.uow.groups.create({
      name: trimmedName,
      description: trimmedDesc,
      is_active: input.is_active ?? true,
      is_default: input.is_default ?? false,
      tenant_id: tenantId,
    });

    await this.uow.auditLogs.create({
      user_id: null,
      username: username ?? 'admin',
      action: 'group_created',
      resource: 'iam_groups',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
      details: { groupId: newGroup.id, name: newGroup.name },
    });

    logger.info({ groupId: newGroup.id, name: newGroup.name }, 'User group created');

    return {
      code: SuccessCode.GROUP_CREATED,
      message: getSuccessMessage(SuccessCode.GROUP_CREATED, SupportedLocales.PT_BR),
      data: {
        id: newGroup.id,
        name: newGroup.name,
        description: newGroup.description,
        is_active: newGroup.is_active,
        is_default: newGroup.is_default,
        member_count: 0,
        tenant_id: newGroup.tenant_id,
        created_at: newGroup.created_at,
        updated_at: newGroup.updated_at,
      },
    };
  }
}

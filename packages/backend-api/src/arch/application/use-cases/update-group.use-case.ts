import { EntityNotFoundError, EntityAlreadyExistsError, ValidationError, ErrorCode, SuccessCode, getSuccessMessage, logger, SupportedLocales } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO, UpdateGroupDTO, GroupListItemDTO } from '../../domain/dtos.js';
import { AuditStatus } from '../../../shared/domain/enums.js';

export class UpdateGroupUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(id: string, input: UpdateGroupDTO, ipAddress?: string, username?: string): Promise<ActionResponseDTO<GroupListItemDTO>> {
    const existingGroup = await this.uow.groups.getById(id);
    if (!existingGroup) {
      throw new EntityNotFoundError('Grupo', id, ErrorCode.GROUP_NOT_FOUND);
    }

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new ValidationError('name', ErrorCode.REQUIRED_FIELDS_MISSING);
      }
      if (trimmedName !== existingGroup.name) {
        const nameConflict = await this.uow.groups.findByName(trimmedName, existingGroup.tenant_id ?? undefined);
        if (nameConflict && nameConflict.id !== id) {
          throw new EntityAlreadyExistsError('Grupo', 'nome', trimmedName, ErrorCode.GROUP_NAME_EXISTS);
        }
      }
    }

    if (input.description !== undefined) {
      const trimmedDesc = input.description.trim();
      if (!trimmedDesc) {
        throw new ValidationError('description', ErrorCode.REQUIRED_FIELDS_MISSING);
      }
    }

    const updatedGroup = await this.uow.groups.update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
    });

    const members = await this.uow.groups.getMembers(id);

    await this.uow.auditLogs.create({
      user_id: null,
      username: username ?? 'admin',
      action: 'group_updated',
      resource: 'iam_groups',
      status: AuditStatus.SUCCESS,
      ip_address: ipAddress ?? null,
      user_agent: null,
      details: { groupId: id, changes: input },
    });

    logger.info({ groupId: id }, 'User group updated');

    return {
      code: SuccessCode.GROUP_UPDATED,
      message: getSuccessMessage(SuccessCode.GROUP_UPDATED, SupportedLocales.PT_BR),
      data: {
        id: updatedGroup.id,
        name: updatedGroup.name,
        description: updatedGroup.description,
        is_active: updatedGroup.is_active,
        is_default: updatedGroup.is_default,
        member_count: members.length,
        tenant_id: updatedGroup.tenant_id,
        created_at: updatedGroup.created_at,
        updated_at: updatedGroup.updated_at,
      },
    };
  }
}

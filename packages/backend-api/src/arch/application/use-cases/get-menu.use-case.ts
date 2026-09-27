import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { UserRole } from '@openclinic/core';
import { UserRole as UserRoleEnum } from '@openclinic/core';
import type { MenuItemDTO } from '../../domain/dtos.js';
import { IAMPermissionService } from '../services/iam-permission.service.js';

export interface GetMenuResponseDTO {
  role: UserRole;
  items: MenuItemDTO[];
}

export class GetMenuUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(role: UserRole, userId?: string): Promise<GetMenuResponseDTO> {
    if (role === UserRoleEnum.OWNER || !userId) {
      const items = await this.uow.resources.listMenusForRole(role);
      return { role, items };
    }

    const iamService = new IAMPermissionService(this.uow);
    const capabilities = await iamService.getUserCapabilities(userId);
    const allowedKeys = new Set(capabilities.map((c) => c.key));

    const allMenus: MenuItemDTO[] = await this.uow.resources.listMenusForRole(role);
    const filteredItems = allMenus.filter((m) => allowedKeys.has(m.item_code));

    return {
      role,
      items: filteredItems,
    };
  }
}

import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { GroupListItemDTO } from '../../domain/dtos.js';

export class ListGroupsUseCase {
  constructor(private readonly uow: IAMUnitOfWork) {}

  async execute(tenantId?: string): Promise<GroupListItemDTO[]> {
    return this.uow.groups.findAllWithMemberCount(tenantId);
  }
}

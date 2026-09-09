import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { RemoveGroupMemberUseCase } from './remove-group-member.use-case.js';

export class RemoveUserFromGroupUseCase {
  private readonly removeGroupMemberUseCase: RemoveGroupMemberUseCase;

  constructor(uow: IAMUnitOfWork) {
    this.removeGroupMemberUseCase = new RemoveGroupMemberUseCase(uow);
  }

  async execute(userId: string, groupId: string, ipAddress?: string, username?: string): Promise<ActionResponseDTO<{ userId: string; groupId: string }>> {
    const res = await this.removeGroupMemberUseCase.execute(groupId, userId, ipAddress, username);
    return {
      code: res.code,
      message: res.message,
      data: { userId, groupId },
    };
  }
}

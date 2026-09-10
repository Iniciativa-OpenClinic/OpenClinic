import type { IAMUnitOfWork } from '../../domain/repositories.js';
import type { ActionResponseDTO } from '../../domain/dtos.js';
import { AddGroupMemberUseCase } from './add-group-member.use-case.js';

export class AddUserToGroupUseCase {
  private readonly addGroupMemberUseCase: AddGroupMemberUseCase;

  constructor(uow: IAMUnitOfWork) {
    this.addGroupMemberUseCase = new AddGroupMemberUseCase(uow);
  }

  async execute(userId: string, groupId: string, ipAddress?: string, username?: string): Promise<ActionResponseDTO<{ userId: string; groupId: string }>> {
    const res = await this.addGroupMemberUseCase.execute(groupId, userId, ipAddress, username);
    return {
      code: res.code,
      message: res.message,
      data: { userId, groupId },
    };
  }
}

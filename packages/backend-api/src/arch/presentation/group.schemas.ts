import { z } from 'zod';
import { ErrorCode, getErrorMessage } from '@openclinic/core';

export const CreateGroupRequestSchema = z.object({
  name: z.string().min(2, getErrorMessage(ErrorCode.VALIDATION_ERROR)).max(255),
  description: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)).max(1000),
  is_active: z.boolean().optional(),
});

export const UpdateGroupRequestSchema = z.object({
  name: z.string().min(2, getErrorMessage(ErrorCode.VALIDATION_ERROR)).max(255).optional(),
  description: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)).max(1000).optional(),
  is_active: z.boolean().optional(),
});

export const AddGroupMemberRequestSchema = z.object({
  user_id: z.string().uuid(getErrorMessage(ErrorCode.VALIDATION_ERROR)),
});

export const AddUserToGroupRequestSchema = z.object({
  group_id: z.string().uuid(getErrorMessage(ErrorCode.VALIDATION_ERROR)),
});

export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequestSchema>;
export type AddGroupMemberRequest = z.infer<typeof AddGroupMemberRequestSchema>;
export type AddUserToGroupRequest = z.infer<typeof AddUserToGroupRequestSchema>;

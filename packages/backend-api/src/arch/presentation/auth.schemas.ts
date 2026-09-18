import { z } from 'zod';
import { ErrorCode, getErrorMessage, UserRole, Cpf } from '@openclinic/core';

export const LoginRequestSchema = z.object({
  identifier: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)),
  password: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(getErrorMessage(ErrorCode.VALIDATION_ERROR)),
  username: z.string().min(3, getErrorMessage(ErrorCode.VALIDATION_ERROR)).max(50),
  password: z.string().min(8, getErrorMessage(ErrorCode.PASSWORD_TOO_SHORT)),
  full_name: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)),
  display_name: z.string().optional(),
});

export const RefreshRequestSchema = z.object({
  refresh_token: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)),
});

export const ChangePasswordRequestSchema = z.object({
  current_password: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)),
  new_password: z.string().min(8, getErrorMessage(ErrorCode.PASSWORD_TOO_SHORT)),
});

export const ForgotPasswordRequestSchema = z.object({
  identifier: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)),
  new_password: z.string().min(8, getErrorMessage(ErrorCode.PASSWORD_TOO_SHORT)),
});

export const CreateUserRequestSchema = z.object({
  email: z.string().email(getErrorMessage(ErrorCode.VALIDATION_ERROR)),
  username: z.string().min(3, getErrorMessage(ErrorCode.VALIDATION_ERROR)),
  cpf: z
    .string()
    .transform((val) => (val ? Cpf.clean(val) : val))
    .refine((val) => !val || Cpf.isValid(val), {
      message: getErrorMessage(ErrorCode.VALIDATION_ERROR),
    })
    .optional()
    .nullable(),
  full_name: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)),
  display_name: z.string().max(120).optional().nullable(),
  job_title: z.string().max(100).optional().nullable(),
  password: z.string().min(8, getErrorMessage(ErrorCode.PASSWORD_TOO_SHORT)),
  role: z.nativeEnum(UserRole),
  tenant_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const UpdateUserRequestSchema = z.object({
  email: z.string().email(getErrorMessage(ErrorCode.VALIDATION_ERROR)),
  username: z.string().min(3, getErrorMessage(ErrorCode.VALIDATION_ERROR)),
  cpf: z
    .string()
    .transform((val) => (val ? Cpf.clean(val) : val))
    .refine((val) => !val || Cpf.isValid(val), {
      message: getErrorMessage(ErrorCode.VALIDATION_ERROR),
    })
    .optional()
    .nullable(),
  full_name: z.string().min(1, getErrorMessage(ErrorCode.REQUIRED_FIELDS_MISSING)),
  display_name: z.string().max(120).optional().nullable(),
  job_title: z.string().max(100).optional().nullable(),
  role: z.nativeEnum(UserRole),
  is_active: z.boolean().optional(),
});

export const AdminResetPasswordRequestSchema = z.object({
  new_password: z.string().min(8, getErrorMessage(ErrorCode.PASSWORD_TOO_SHORT)),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type AdminResetPasswordRequest = z.infer<typeof AdminResetPasswordRequestSchema>;

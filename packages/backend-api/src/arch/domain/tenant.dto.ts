import { z } from 'zod';
import { TenantStatus, Cnpj, ErrorCode, getErrorMessage } from '@openclinic/core';

export const CreateTenantSchema = z.object({
  name: z.string().min(2, getErrorMessage(ErrorCode.VALIDATION_ERROR)).max(255),
  slug: z.string().min(2, getErrorMessage(ErrorCode.VALIDATION_ERROR)).max(100).regex(/^[a-z0-9_.-]+$/, getErrorMessage(ErrorCode.VALIDATION_ERROR)),
  status: z.enum([TenantStatus.ACTIVE, TenantStatus.SUSPENDED, TenantStatus.DELETED]).default(TenantStatus.ACTIVE),
  taxId: z.string().max(50).nullable().optional(),
  cnpj: z
    .string()
    .transform((val) => (val ? Cnpj.clean(val) : val))
    .refine((val) => !val || Cnpj.isValid(val), {
      message: getErrorMessage(ErrorCode.VALIDATION_ERROR),
    })
    .nullable()
    .optional(),
  contactName: z.string().max(255).nullable().optional(),
  contactTitle: z.string().max(100).nullable().optional(),
  contactEmail: z.string().max(255).nullable().optional(),
  contactPhone: z.string().max(20).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  street: z.string().max(255).nullable().optional(),
  number: z.string().max(20).nullable().optional(),
  complement: z.string().max(100).nullable().optional(),
  neighborhood: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  country: z.string().max(50).nullable().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;

export const UpdateTenantSchema = CreateTenantSchema.partial();

export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>;

export interface TenantResponseDTO {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  taxId?: string | null;
  cnpj?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

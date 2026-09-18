import { z } from 'zod';
import { LoginIdentifierType } from '@openclinic/core';

export const UpdatePlatformApplicationSchema = z.object({
  appName: z.string().min(1).max(255).optional(),
  appSubtitle: z.string().max(255).nullable().optional(),
  appVersion: z.string().max(50).optional(),
  appDescription: z.string().nullable().optional(),
  appLogoUrl: z.string().max(500).nullable().optional(),
  appFaviconUrl: z.string().max(500).nullable().optional(),
  defaultLocale: z.string().max(10).optional(),
  defaultSupportedLocales: z.array(z.string()).optional(),
  defaultTimezone: z.string().max(50).optional(),
  defaultDialingCode: z.string().max(5).optional(),
  defaultMaxLoginAttempts: z.number().int().min(1).max(20).optional(),
  defaultLockoutDurationMinutes: z.number().int().min(1).max(1440).optional(),
  defaultSessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
  defaultMinPasswordLength: z.number().int().min(6).max(128).optional(),
  defaultMfaEnabled: z.boolean().optional(),
  defaultPasswordResetTokenTtlHours: z.number().int().min(1).max(168).optional(),
  defaultEnableAuditLog: z.boolean().optional(),
  defaultAuditRetentionDays: z.number().int().min(30).max(3650).optional(),
  defaultAcceptedLoginMethods: z.array(z.string()).optional(),
  defaultExtraSettings: z.record(z.unknown()).optional(),
  primaryLoginIdentifier: z.nativeEnum(LoginIdentifierType).optional(),
  isMultiTenant: z.boolean().optional(),
});

export type UpdatePlatformApplicationDto = z.infer<typeof UpdatePlatformApplicationSchema>;

export const UpdateTenantApplicationConfigSchema = z.object({
  isActive: z.boolean().optional(),
  enforceDocumentAcceptanceOnLogin: z.boolean().optional(),
  configJson: z.record(z.unknown()).optional(),
});

export type UpdateTenantApplicationConfigDto = z.infer<typeof UpdateTenantApplicationConfigSchema>;

export interface PlatformApplicationEntity {
  id: string;
  code: string;
  appName: string;
  appVersion: string;
  appLogoUrl: string | null;
  appFaviconUrl: string | null;
  appSubtitle: string | null;
  appDescription: string | null;
  defaultLocale: string;
  defaultSupportedLocales: string[];
  defaultTimezone: string;
  defaultDialingCode: string;
  defaultMaxLoginAttempts: number;
  defaultLockoutDurationMinutes: number;
  defaultSessionTimeoutMinutes: number;
  defaultMinPasswordLength: number;
  defaultMfaEnabled: boolean;
  defaultPasswordResetTokenTtlHours: number;
  defaultEnableAuditLog: boolean;
  defaultAuditRetentionDays: number;
  defaultAcceptedLoginMethods: string[];
  defaultExtraSettings: Record<string, unknown>;
  primaryLoginIdentifier: LoginIdentifierType;
  isMultiTenant: boolean;
  isDefaultApplication: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantApplicationConfigEntity {
  id: string;
  applicationId: string;
  tenantId: string | null;
  isPrimaryForTenant: boolean;
  isActive: boolean;
  enforceDocumentAcceptanceOnLogin: boolean;
  configJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantApplicationConfigResponse {
  application: {
    id: string;
    code: string;
    appName: string;
    appVersion: string;
    appSubtitle: string | null;
    appDescription: string | null;
    appLogoUrl: string | null;
    appFaviconUrl: string | null;
    defaultLocale: string;
    defaultSupportedLocales: string[];
    defaultTimezone: string;
    isMultiTenant: boolean;
  };
  config: {
    id: string;
    applicationId: string;
    tenantId: string | null;
    isPrimaryForTenant: boolean;
    isActive: boolean;
    enforceDocumentAcceptanceOnLogin: boolean;
    configJson: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
}

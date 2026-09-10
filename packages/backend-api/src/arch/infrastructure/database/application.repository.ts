import { eq, and, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { sysApplications, sysApplicationConfigs } from './drizzle-schema.js';
import type {
  PlatformApplicationEntity,
  TenantApplicationConfigEntity,
  UpdatePlatformApplicationDto,
  UpdateTenantApplicationConfigDto,
} from '../../domain/application.dto.js';

export class ApplicationRepository {
  constructor(private db: PostgresJsDatabase) {}

  async getDefaultApplication(): Promise<PlatformApplicationEntity | null> {
    const [defaultApp] = await this.db
      .select()
      .from(sysApplications)
      .where(and(eq(sysApplications.isDefaultApplication, true), isNull(sysApplications.deletedAt)))
      .limit(1);

    if (defaultApp) {
      return defaultApp as unknown as PlatformApplicationEntity;
    }

    const [fallbackApp] = await this.db
      .select()
      .from(sysApplications)
      .where(and(eq(sysApplications.isActive, true), isNull(sysApplications.deletedAt)))
      .limit(1);

    return (fallbackApp as unknown as PlatformApplicationEntity) ?? null;
  }

  async getApplicationById(id: string): Promise<PlatformApplicationEntity | null> {
    const [app] = await this.db
      .select()
      .from(sysApplications)
      .where(and(eq(sysApplications.id, id), isNull(sysApplications.deletedAt)))
      .limit(1);

    return (app as unknown as PlatformApplicationEntity) ?? null;
  }

  async getApplicationByCode(code: string): Promise<PlatformApplicationEntity | null> {
    const [app] = await this.db
      .select()
      .from(sysApplications)
      .where(and(eq(sysApplications.code, code), isNull(sysApplications.deletedAt)))
      .limit(1);

    return (app as unknown as PlatformApplicationEntity) ?? null;
  }

  async updateApplication(
    id: string,
    data: UpdatePlatformApplicationDto
  ): Promise<PlatformApplicationEntity> {
    const [updated] = await this.db
      .update(sysApplications)
      .set({
        ...data,
        updatedAt: new Date(),
      } as typeof sysApplications.$inferInsert)
      .where(eq(sysApplications.id, id))
      .returning();

    return updated as unknown as PlatformApplicationEntity;
  }

  async getTenantApplicationConfig(
    applicationId: string,
    tenantId?: string | null
  ): Promise<TenantApplicationConfigEntity> {
    const conditions = [
      eq(sysApplicationConfigs.application_id, applicationId),
      isNull(sysApplicationConfigs.deleted_at),
    ];

    if (tenantId) {
      conditions.push(eq(sysApplicationConfigs.tenant_id, tenantId));
    }

    const [existing] = await this.db
      .select()
      .from(sysApplicationConfigs)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      return this.mapTenantConfig(existing);
    }

    // Default configuration if none exists yet
    const newId = randomUUID();
    const [created] = await this.db
      .insert(sysApplicationConfigs)
      .values({
        id: newId,
        application_id: applicationId,
        tenant_id: tenantId ?? null,
        is_primary_for_tenant: true,
        is_active: true,
        enforce_document_acceptance_on_login: false,
        config_json: {
          operatingHours: {
            weekdays: '07:00 - 19:00',
            saturdays: '08:00 - 12:00',
            sundays: 'Fechado',
          },
          appointmentIntervalMinutes: 30,
          cancellationLeadTimeHours: 24,
        },
      } as typeof sysApplicationConfigs.$inferInsert)
      .returning();

    return this.mapTenantConfig(created);
  }

  async upsertTenantApplicationConfig(
    applicationId: string,
    tenantId: string | null | undefined,
    data: UpdateTenantApplicationConfigDto
  ): Promise<TenantApplicationConfigEntity> {
    const current = await this.getTenantApplicationConfig(applicationId, tenantId);

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (data.isActive !== undefined) {
      updatePayload['is_active'] = data.isActive;
    }
    if (data.enforceDocumentAcceptanceOnLogin !== undefined) {
      updatePayload['enforce_document_acceptance_on_login'] = data.enforceDocumentAcceptanceOnLogin;
    }
    if (data.configJson !== undefined) {
      updatePayload['config_json'] = {
        ...current.configJson,
        ...data.configJson,
      };
    }

    const [updated] = await this.db
      .update(sysApplicationConfigs)
      .set(updatePayload as typeof sysApplicationConfigs.$inferInsert)
      .where(eq(sysApplicationConfigs.id, current.id))
      .returning();

    return this.mapTenantConfig(updated);
  }

  private mapTenantConfig(raw: typeof sysApplicationConfigs.$inferSelect): TenantApplicationConfigEntity {
    return {
      id: raw.id,
      applicationId: raw.application_id,
      tenantId: raw.tenant_id,
      isPrimaryForTenant: raw.is_primary_for_tenant,
      isActive: raw.is_active,
      enforceDocumentAcceptanceOnLogin: raw.enforce_document_acceptance_on_login,
      configJson: (raw.config_json as Record<string, unknown>) ?? {},
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}

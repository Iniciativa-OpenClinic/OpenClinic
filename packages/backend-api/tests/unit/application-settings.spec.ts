import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationRepository } from '../../src/arch/infrastructure/database/application.repository.js';
import type { PlatformApplicationEntity, TenantApplicationConfigEntity } from '../../src/arch/domain/application.dto.js';

describe('ApplicationRepository & Application Settings', () => {
  let mockDb: any;
  let repo: ApplicationRepository;

  const sampleApp: PlatformApplicationEntity = {
    id: 'app-default-1',
    code: 'openclinic',
    appName: 'OpenClinic',
    appVersion: '1.0.0',
    appLogoUrl: 'https://example.com/logo.png',
    appFaviconUrl: 'https://example.com/favicon.ico',
    appSubtitle: 'Prontuário Eletrônico do Paciente (PEP) Open Source',
    appDescription: 'OpenClinic Clinical Management System',
    defaultLocale: 'pt-BR',
    defaultSupportedLocales: ['pt-BR', 'en-US'],
    defaultTimezone: 'America/Sao_Paulo',
    defaultDialingCode: '+55',
    defaultMaxLoginAttempts: 5,
    defaultLockoutDurationMinutes: 15,
    defaultSessionTimeoutMinutes: 30,
    defaultMinPasswordLength: 8,
    defaultMfaEnabled: false,
    defaultPasswordResetTokenTtlHours: 24,
    defaultEnableAuditLog: true,
    defaultAuditRetentionDays: 365,
    defaultAcceptedLoginMethods: ['PASSWORD'],
    defaultExtraSettings: {},
    isMultiTenant: false,
    isDefaultApplication: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleConfig: TenantApplicationConfigEntity = {
    id: 'cfg-1',
    applicationId: 'app-default-1',
    tenantId: 'tenant-1',
    isPrimaryForTenant: true,
    isActive: true,
    enforceDocumentAcceptanceOnLogin: false,
    configJson: {
      operatingHours: {
        weekdays: '07:00 - 19:00',
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    repo = new ApplicationRepository(mockDb);
  });

  it('should return default application when exists', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([sampleApp]),
    };
    mockDb.select.mockReturnValue(chain);

    const app = await repo.getDefaultApplication();
    expect(app).toBeDefined();
    expect(app?.code).toBe('openclinic');
    expect(app?.appName).toBe('OpenClinic');
    expect(app?.appSubtitle).toBe('Prontuário Eletrônico do Paciente (PEP) Open Source');
    expect(app?.appLogoUrl).toBe('https://example.com/logo.png');
    expect(app?.appFaviconUrl).toBe('https://example.com/favicon.ico');
  });

  it('should update application properties', async () => {
    const chain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ ...sampleApp, appName: 'OpenClinic Pro' }]),
    };
    mockDb.update.mockReturnValue(chain);

    const updated = await repo.updateApplication('app-default-1', {
      appName: 'OpenClinic Pro',
    });

    expect(updated.appName).toBe('OpenClinic Pro');
  });

  it('should get or initialize tenant configuration', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: 'cfg-1',
          application_id: 'app-default-1',
          tenant_id: 'tenant-1',
          is_primary_for_tenant: true,
          is_active: true,
          enforce_document_acceptance_on_login: false,
          config_json: { appointmentIntervalMinutes: 30 },
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]),
    };
    mockDb.select.mockReturnValue(chain);

    const config = await repo.getTenantApplicationConfig('app-default-1', 'tenant-1');
    expect(config).toBeDefined();
    expect(config.applicationId).toBe('app-default-1');
    expect(config.configJson).toHaveProperty('appointmentIntervalMinutes', 30);
  });
});

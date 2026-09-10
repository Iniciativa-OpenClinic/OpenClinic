import type { FastifyInstance } from 'fastify';
import {
  type JwtConfig,
  UserRole,
  EntityNotFoundError,
  ErrorCode,
  AuthenticationError,
  LoginIdentifierType,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../domain/repositories.js';
import {
  UpdatePlatformApplicationSchema,
  UpdateTenantApplicationConfigSchema,
  type TenantApplicationConfigResponse,
} from '../domain/application.dto.js';
import { createAuthenticateJwt } from './middlewares/authenticate-jwt.js';
import { requireRole } from './middlewares/require-permission.js';
import { SecurityBearer, StandardErrorResponses } from './openapi.schemas.js';

export const APPLICATION_ROUTES = {
  PUBLIC_CONFIG: '/api/v1/public/config',
  PUBLIC_APPLICATION: '/api/v1/arch/public/application',
  PLATFORM_APPLICATION: '/api/v1/arch/platform/application',
  TENANT_CURRENT_CONFIG: '/api/v1/arch/application-configs/current',
  // Backward compatibility aliases
  LEGACY_PUBLIC_APPLICATION: '/api/v1/system/public/application',
  LEGACY_PLATFORM_APPLICATION: '/api/v1/system/platform/application',
  LEGACY_TENANT_CURRENT_CONFIG: '/api/v1/system/application-configs/current',
} as const;

export const APPLICATION_SWAGGER_TAG = 'Architecture & Platform';

export function registerApplicationRoutes(
  app: FastifyInstance,
  uow: IAMUnitOfWork,
  jwtConfig: JwtConfig
): void {
  const authenticateJwt = createAuthenticateJwt(jwtConfig);

  // ── 0. PUBLIC BRANDING & APP METADATA (Public / Unauthenticated Bootstrap) ──

  const publicConfigHandler = async (_request: any, reply: any) => {
    const defaultApp = await uow.applications.getDefaultApplication();
    if (!defaultApp) {
      throw new EntityNotFoundError('Application', 'default');
    }
    const defaultTenant = await uow.tenants?.getDefaultTenant();

    return reply
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', '0')
      .status(200)
      .send({
      appName: defaultApp.appName,
      appSubtitle: defaultApp.appSubtitle,
      appVersion: defaultApp.appVersion,
      appLogoUrl: defaultApp.appLogoUrl,
      appFaviconUrl: defaultApp.appFaviconUrl,
      appDescription: defaultApp.appDescription,
      tenantName: defaultTenant?.name ?? 'OpenClinic System',
      defaultLocale: defaultApp.defaultLocale,
      defaultSupportedLocales: defaultApp.defaultSupportedLocales,
      defaultTimezone: defaultApp.defaultTimezone,
      defaultDialingCode: defaultApp.defaultDialingCode,
      acceptedLoginMethods: defaultApp.defaultAcceptedLoginMethods,
      primaryLoginIdentifier: defaultApp.primaryLoginIdentifier ?? LoginIdentifierType.CPF,
      // snake_case aliases for legacy client parity
      app_name: defaultApp.appName,
      app_subtitle: defaultApp.appSubtitle,
      app_version: defaultApp.appVersion,
      app_logo_url: defaultApp.appLogoUrl,
      app_favicon_url: defaultApp.appFaviconUrl,
      tenant_name: defaultTenant?.name ?? 'OpenClinic System',
      default_locale: defaultApp.defaultLocale,
      supported_locales: defaultApp.defaultSupportedLocales,
      default_timezone: defaultApp.defaultTimezone,
      default_dialing_code: defaultApp.defaultDialingCode,
      accepted_login_methods: defaultApp.defaultAcceptedLoginMethods,
      primary_login_identifier: defaultApp.primaryLoginIdentifier ?? LoginIdentifierType.CPF,
    });
  };

  const publicConfigSchema = {
    schema: {
      tags: [APPLICATION_SWAGGER_TAG],
      summary: 'Get Public Application Branding and Settings',
      description: 'Returns publicly accessible application branding (appSubtitle, appLogoUrl, appFaviconUrl, locales) from database for unauthenticated bootstrap.',
      response: {
        200: {
          description: 'Public application branding parameters',
          type: 'object',
          properties: {
            appName: { type: 'string' },
            appSubtitle: { type: ['string', 'null'] },
            appVersion: { type: 'string' },
            appLogoUrl: { type: ['string', 'null'] },
            appFaviconUrl: { type: ['string', 'null'] },
            appDescription: { type: ['string', 'null'] },
            tenantName: { type: 'string' },
            defaultLocale: { type: 'string' },
            defaultSupportedLocales: { type: 'array', items: { type: 'string' } },
            defaultTimezone: { type: 'string' },
            defaultDialingCode: { type: 'string' },
            acceptedLoginMethods: { type: 'array', items: { type: 'string' } },
            primaryLoginIdentifier: { type: 'string', enum: Object.values(LoginIdentifierType) },
            app_name: { type: 'string' },
            app_subtitle: { type: ['string', 'null'] },
            app_version: { type: 'string' },
            app_logo_url: { type: ['string', 'null'] },
            app_favicon_url: { type: ['string', 'null'] },
            tenant_name: { type: 'string' },
            default_locale: { type: 'string' },
            supported_locales: { type: 'array', items: { type: 'string' } },
            default_timezone: { type: 'string' },
            default_dialing_code: { type: 'string' },
            accepted_login_methods: { type: 'array', items: { type: 'string' } },
            primary_login_identifier: { type: 'string', enum: Object.values(LoginIdentifierType) },
          },
        },
        ...StandardErrorResponses,
      },
    },
  };

  // GET /api/v1/public/config (Public standard endpoint)
  app.get(APPLICATION_ROUTES.PUBLIC_CONFIG, publicConfigSchema, publicConfigHandler);

  // GET /api/v1/arch/public/application (canonical)
  app.get(APPLICATION_ROUTES.PUBLIC_APPLICATION, publicConfigSchema, publicConfigHandler);

  // GET /api/v1/system/public/application (legacy alias)
  app.get(APPLICATION_ROUTES.LEGACY_PUBLIC_APPLICATION, publicConfigSchema, publicConfigHandler);

  // ── 1. PLATFORM SETTINGS (Exclusive to OWNER) ──

  // GET /api/v1/system/platform/application
  app.get(
    APPLICATION_ROUTES.PLATFORM_APPLICATION,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.OWNER)],
      schema: {
        tags: [APPLICATION_SWAGGER_TAG],
        summary: 'Get Platform Base Application Settings',
        description: 'Returns the primary application record with branding, platform security invariants, and audit policies (OWNER only).',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Platform application data',
            type: 'object',
            properties: {
              id: { type: 'string' },
              code: { type: 'string' },
              appName: { type: 'string' },
              appVersion: { type: 'string' },
              appLogoUrl: { type: ['string', 'null'] },
              appFaviconUrl: { type: ['string', 'null'] },
              appSubtitle: { type: ['string', 'null'] },
              appDescription: { type: ['string', 'null'] },
              defaultLocale: { type: 'string' },
              defaultSupportedLocales: { type: 'array', items: { type: 'string' } },
              defaultTimezone: { type: 'string' },
              defaultDialingCode: { type: 'string' },
              defaultMaxLoginAttempts: { type: 'number' },
              defaultLockoutDurationMinutes: { type: 'number' },
              defaultSessionTimeoutMinutes: { type: 'number' },
              defaultMinPasswordLength: { type: 'number' },
              defaultMfaEnabled: { type: 'boolean' },
              defaultPasswordResetTokenTtlHours: { type: 'number' },
              defaultEnableAuditLog: { type: 'boolean' },
              defaultAuditRetentionDays: { type: 'number' },
              defaultAcceptedLoginMethods: { type: 'array', items: { type: 'string' } },
              defaultExtraSettings: { type: 'object', additionalProperties: true },
              primaryLoginIdentifier: { type: 'string', enum: Object.values(LoginIdentifierType) },
              isMultiTenant: { type: 'boolean' },
              isDefaultApplication: { type: 'boolean' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (_request, reply) => {
      const defaultApp = await uow.applications.getDefaultApplication();
      if (!defaultApp) {
        throw new EntityNotFoundError('Application', 'default');
      }
      return reply.status(200).send(defaultApp);
    }
  );
  app.get(APPLICATION_ROUTES.LEGACY_PLATFORM_APPLICATION, { preHandler: [authenticateJwt, requireRole(UserRole.OWNER)] }, async (_request, reply) => {
    const defaultApp = await uow.applications.getDefaultApplication();
    if (!defaultApp) throw new EntityNotFoundError('Application', 'default');
    return reply.status(200).send(defaultApp);
  });

  // PUT /api/v1/system/platform/application
  app.put(
    APPLICATION_ROUTES.PLATFORM_APPLICATION,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.OWNER)],
      schema: {
        tags: [APPLICATION_SWAGGER_TAG],
        summary: 'Update Platform Base Application Settings',
        description: 'Updates branding, platform security invariants, and audit policies for the base application (OWNER only).',
        security: SecurityBearer,
        body: {
          type: 'object',
          properties: {
            appName: { type: 'string' },
            appSubtitle: { type: ['string', 'null'] },
            appVersion: { type: 'string' },
            appDescription: { type: ['string', 'null'] },
            appLogoUrl: { type: ['string', 'null'] },
            appFaviconUrl: { type: ['string', 'null'] },
            defaultLocale: { type: 'string' },
            defaultSupportedLocales: { type: 'array', items: { type: 'string' } },
            defaultTimezone: { type: 'string' },
            defaultDialingCode: { type: 'string' },
            defaultMaxLoginAttempts: { type: 'number' },
            defaultLockoutDurationMinutes: { type: 'number' },
            defaultSessionTimeoutMinutes: { type: 'number' },
            defaultMinPasswordLength: { type: 'number' },
            defaultMfaEnabled: { type: 'boolean' },
            defaultPasswordResetTokenTtlHours: { type: 'number' },
            defaultEnableAuditLog: { type: 'boolean' },
            defaultAuditRetentionDays: { type: 'number' },
            defaultAcceptedLoginMethods: { type: 'array', items: { type: 'string' } },
            defaultExtraSettings: { type: 'object', additionalProperties: true },
            primaryLoginIdentifier: { type: 'string', enum: Object.values(LoginIdentifierType) },
            isMultiTenant: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Platform application updated successfully',
            type: 'object',
            properties: {
              code: { type: 'string', example: 'OK' },
              message: { type: 'string', example: 'Platform application updated successfully' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const defaultApp = await uow.applications.getDefaultApplication();
      if (!defaultApp) {
        throw new EntityNotFoundError('Application', 'default');
      }

      const parsedBody = UpdatePlatformApplicationSchema.parse(request.body);
      const updated = await uow.applications.updateApplication(defaultApp.id, parsedBody);

      return reply.status(200).send({
        code: 'OK',
        message: 'Platform application updated successfully',
        data: updated,
      });
    }
  );
  app.put(APPLICATION_ROUTES.LEGACY_PLATFORM_APPLICATION, { preHandler: [authenticateJwt, requireRole(UserRole.OWNER)] }, async (request, reply) => {
    const defaultApp = await uow.applications.getDefaultApplication();
    if (!defaultApp) throw new EntityNotFoundError('Application', 'default');
    const parsedBody = UpdatePlatformApplicationSchema.parse(request.body);
    const updated = await uow.applications.updateApplication(defaultApp.id, parsedBody);
    return reply.status(200).send({ code: 'OK', message: 'Platform application updated successfully', data: updated });
  });

  // ── 2. TENANT APPLICATION CONFIGURATION (ADMIN & OWNER) ──

  // GET /api/v1/system/application-configs/current
  app.get(
    APPLICATION_ROUTES.TENANT_CURRENT_CONFIG,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [APPLICATION_SWAGGER_TAG],
        summary: 'Get Current Tenant Application Configuration',
        description: 'Returns the application metadata combined with current tenant operational parameters (ADMIN or OWNER).',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Tenant application configuration data',
            type: 'object',
            properties: {
              application: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  code: { type: 'string' },
                  appName: { type: 'string' },
                  appVersion: { type: 'string' },
                  appSubtitle: { type: ['string', 'null'] },
                  appDescription: { type: ['string', 'null'] },
                  appLogoUrl: { type: ['string', 'null'] },
                  appFaviconUrl: { type: ['string', 'null'] },
                  defaultLocale: { type: 'string' },
                  defaultSupportedLocales: { type: 'array', items: { type: 'string' } },
                  defaultTimezone: { type: 'string' },
                  isMultiTenant: { type: 'boolean' },
                },
              },
              config: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  applicationId: { type: 'string' },
                  tenantId: { type: ['string', 'null'] },
                  isPrimaryForTenant: { type: 'boolean' },
                  isActive: { type: 'boolean' },
                  enforceDocumentAcceptanceOnLogin: { type: 'boolean' },
                  configJson: { type: 'object', additionalProperties: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        throw new AuthenticationError(ErrorCode.AUTH_FAILED);
      }

      const defaultApp = await uow.applications.getDefaultApplication();
      if (!defaultApp) {
        throw new EntityNotFoundError('Application', 'default');
      }

      const tenantConfig = await uow.applications.getTenantApplicationConfig(
        defaultApp.id,
        user.tenant_id
      );

      const responsePayload: TenantApplicationConfigResponse = {
        application: {
          id: defaultApp.id,
          code: defaultApp.code,
          appName: defaultApp.appName,
          appVersion: defaultApp.appVersion,
          appSubtitle: defaultApp.appSubtitle,
          appDescription: defaultApp.appDescription,
          appLogoUrl: defaultApp.appLogoUrl,
          appFaviconUrl: defaultApp.appFaviconUrl,
          defaultLocale: defaultApp.defaultLocale,
          defaultSupportedLocales: defaultApp.defaultSupportedLocales,
          defaultTimezone: defaultApp.defaultTimezone,
          isMultiTenant: defaultApp.isMultiTenant,
        },
        config: tenantConfig,
      };

      return reply.status(200).send(responsePayload);
    }
  );
  app.get(APPLICATION_ROUTES.LEGACY_TENANT_CURRENT_CONFIG, { preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)] }, async (request, reply) => {
    const user = request.user;
    if (!user) throw new AuthenticationError(ErrorCode.AUTH_FAILED);
    const defaultApp = await uow.applications.getDefaultApplication();
    if (!defaultApp) throw new EntityNotFoundError('Application', 'default');
    const tenantConfig = await uow.applications.getTenantApplicationConfig(defaultApp.id, user.tenant_id);
    return reply.status(200).send({
      application: {
        id: defaultApp.id,
        code: defaultApp.code,
        appName: defaultApp.appName,
        appVersion: defaultApp.appVersion,
        appSubtitle: defaultApp.appSubtitle,
        appDescription: defaultApp.appDescription,
        appLogoUrl: defaultApp.appLogoUrl,
        appFaviconUrl: defaultApp.appFaviconUrl,
        defaultLocale: defaultApp.defaultLocale,
        defaultSupportedLocales: defaultApp.defaultSupportedLocales,
        defaultTimezone: defaultApp.defaultTimezone,
        isMultiTenant: defaultApp.isMultiTenant,
      },
      config: tenantConfig,
    });
  });

  // PUT /api/v1/system/application-configs/current
  app.put(
    APPLICATION_ROUTES.TENANT_CURRENT_CONFIG,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [APPLICATION_SWAGGER_TAG],
        summary: 'Update Current Tenant Application Configuration',
        description: 'Updates local operational parameters and rules for the current tenant in sys_application_configs (ADMIN or OWNER).',
        security: SecurityBearer,
        body: {
          type: 'object',
          properties: {
            isActive: { type: 'boolean' },
            enforceDocumentAcceptanceOnLogin: { type: 'boolean' },
            configJson: { type: 'object', additionalProperties: true },
          },
        },
        response: {
          200: {
            description: 'Tenant application config updated successfully',
            type: 'object',
            properties: {
              code: { type: 'string', example: 'OK' },
              message: { type: 'string', example: 'Tenant application configuration updated successfully' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        throw new AuthenticationError(ErrorCode.AUTH_FAILED);
      }

      const defaultApp = await uow.applications.getDefaultApplication();
      if (!defaultApp) {
        throw new EntityNotFoundError('Application', 'default');
      }

      const parsedBody = UpdateTenantApplicationConfigSchema.parse(request.body);
      const updatedConfig = await uow.applications.upsertTenantApplicationConfig(
        defaultApp.id,
        user.tenant_id,
        parsedBody
      );

      return reply.status(200).send({
        code: 'OK',
        message: 'Tenant application configuration updated successfully',
        data: updatedConfig,
      });
    }
  );
  app.put(APPLICATION_ROUTES.LEGACY_TENANT_CURRENT_CONFIG, { preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)] }, async (request, reply) => {
    const user = request.user;
    if (!user) throw new AuthenticationError(ErrorCode.AUTH_FAILED);
    const defaultApp = await uow.applications.getDefaultApplication();
    if (!defaultApp) throw new EntityNotFoundError('Application', 'default');
    const parsedBody = UpdateTenantApplicationConfigSchema.parse(request.body);
    const updatedConfig = await uow.applications.upsertTenantApplicationConfig(defaultApp.id, user.tenant_id, parsedBody);
    return reply.status(200).send({ code: 'OK', message: 'Tenant application configuration updated successfully', data: updatedConfig });
  });
}

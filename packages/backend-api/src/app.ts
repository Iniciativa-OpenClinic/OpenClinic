import { registerUnitRoutes } from './arch/presentation/unit.router.js';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { AccessDeniedError, ErrorCode, ResourceAction, type JwtConfig } from '@openclinic/core';
import { env } from './config/env.js';
import { swaggerOptions, swaggerUiOptions } from './config/swagger.js';
import { ProblemDetailsSchema } from './arch/presentation/openapi.schemas.js';
import { UnitOfWork } from './arch/infrastructure/database/uow.js';
import { registerAuthRoutes } from './arch/presentation/auth.router.js';
import { registerUserRoutes } from './arch/presentation/user.router.js';
import { registerGroupRoutes } from './arch/presentation/group.router.js';
import { registerIamRoutes } from './arch/presentation/iam.router.js';
import { registerApplicationRoutes } from './arch/presentation/application.router.js';
import { registerTenantRoutes } from './arch/presentation/tenant.router.js';
import { errorHandler } from './arch/presentation/error-handler.js';
import { registerPractitionerRoutes } from './arch/presentation/practitioner.router.js';
import { registerPatientRoutes } from './arch/presentation/patient.router.js';
import { createAuthenticateJwt } from './arch/presentation/middlewares/authenticate-jwt.js';
import { requirePermission } from './arch/presentation/middlewares/require-permission.js';

export interface BuildAppOptions {
  jwtConfig?: JwtConfig;
  uow?: UnitOfWork;
  dbUrl?: string;
  enableSwaggerUi?: boolean;
  corsAllowedOrigins?: string[] | string;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        strict: false,
        keywords: ['example'],
      },
    },
  });

  // Reusable schemas
  app.addSchema(ProblemDetailsSchema);

  // Database & UOW
  const sql = postgres(options.dbUrl ?? env.DATABASE_URL);
  const db = drizzle(sql);
  const uow = options.uow ?? new UnitOfWork(db);

  // Clean up database connection on app shutdown
  app.addHook('onClose', async () => {
    await sql.end({ timeout: 5 });
  });

  // JWT Configuration
  const jwtConfig: JwtConfig = options.jwtConfig ?? {
    secretKey: env.JWT_KEY,
    algorithm: env.JWT_ALGORITHM,
    accessTokenExpireMinutes: env.ACCESS_TOKEN_EXPIRE_MINUTES,
    refreshTokenExpireDays: env.REFRESH_TOKEN_EXPIRE_DAYS,
  };

  // Content-Type Parser
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const json = body && (body as string).trim() ? JSON.parse(body as string) : {};
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // CORS Configuration with strict Origin Allowlist
  const rawOrigins = options.corsAllowedOrigins ?? env.CORS_ALLOWED_ORIGINS;
  const allowedOrigins = (Array.isArray(rawOrigins) ? rawOrigins : rawOrigins.split(','))
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow non-browser requests without origin (curl, mobile apps, server-to-server)
      if (!origin) {
        cb(null, true);
        return;
      }
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
  });
  await app.register(cookie);

  // OpenAPI Swagger & Swagger UI
  await app.register(swagger, swaggerOptions);
  if (options.enableSwaggerUi !== false) {
    await app.register(swaggerUi, swaggerUiOptions);
  }

  // Error Handler
  app.setErrorHandler(errorHandler);

  // Health Check Endpoints: Liveness Probe
  app.get(
    '/health/live',
    {
      schema: {
        tags: ['Health & Monitoring'],
        summary: 'Liveness Probe',
        description: 'Checks if the API process is alive',
        response: {
          200: {
            description: 'Process is alive',
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async () => ({ status: 'ok', timestamp: new Date().toISOString() })
  );

  // Health Check Endpoints: Readiness Probe
  app.get(
    '/health/ready',
    {
      schema: {
        tags: ['Health & Monitoring'],
        summary: 'Readiness Probe',
        description: 'Checks if the API and database dependency are ready to accept traffic',
        response: {
          200: {
            description: 'Service and database are operational',
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              database: { type: 'string', example: 'connected' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          503: {
            description: 'Database check failed',
            type: 'object',
            properties: {
              status: { type: 'string', example: 'error' },
              database: { type: 'string', example: 'disconnected' },
              detail: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      try {
        await sql`SELECT 1`;
        return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
      } catch (err) {
        reply.status(503);
        return {
          status: 'error',
          database: 'disconnected',
          detail: err instanceof Error ? err.message : 'Database check failed',
          timestamp: new Date().toISOString(),
        };
      }
    }
  );

  // Security, Identity, and Governance Routes
  registerAuthRoutes(app, uow, jwtConfig);
  registerUserRoutes(app, uow, jwtConfig);
  registerGroupRoutes(app, uow, jwtConfig);
  registerIamRoutes(app, uow, jwtConfig);
  registerApplicationRoutes(app, uow, jwtConfig);
  registerTenantRoutes(app, uow, jwtConfig);

  await app.register(async (patientApp) => {
    patientApp.addHook('onRequest', createAuthenticateJwt(jwtConfig, uow));
    patientApp.addHook('preHandler', async (request, reply) => {
      if (!request.user?.tenant_id) throw new AccessDeniedError(ErrorCode.FORBIDDEN);
      const action = request.method === 'DELETE' ? ResourceAction.DELETE
        : request.method === 'GET' || request.method === 'HEAD' ? ResourceAction.READ : ResourceAction.WRITE;
      await requirePermission(uow, 'op_patients', action)(request, reply);
    });
    registerPatientRoutes(patientApp, {
      patients: (request) => uow.patientsForTenant(request.user!.tenant_id!),
    });
  });

  await app.register(async (practitionerApp) => {
    practitionerApp.addHook('onRequest', createAuthenticateJwt(jwtConfig, uow));
    practitionerApp.addHook('preHandler', async (request, reply) => {
      if (!request.user?.tenant_id) throw new AccessDeniedError(ErrorCode.FORBIDDEN);
      const action = request.method === 'DELETE' ? ResourceAction.DELETE
        : request.method === 'GET' || request.method === 'HEAD' ? ResourceAction.READ : ResourceAction.WRITE;
      await requirePermission(uow, 'base_staff', action)(request, reply);
    });
    registerPractitionerRoutes(practitionerApp, {
      practitioners: (request) => uow.practitionersForTenant(request.user!.tenant_id!),
    });
  });

  await app.register(async (unitApp) => {
    unitApp.addHook('onRequest', createAuthenticateJwt(jwtConfig, uow));
    unitApp.addHook('preHandler', async (request, reply) => {
      if (!request.user?.tenant_id) throw new AccessDeniedError(ErrorCode.FORBIDDEN);
      const action = request.method === 'DELETE' ? ResourceAction.DELETE
        : request.method === 'GET' || request.method === 'HEAD' ? ResourceAction.READ : ResourceAction.WRITE;
      await requirePermission(uow, 'menu_sys_institution', action)(request, reply);
    });
    registerUnitRoutes(unitApp, {
      units: (request) => uow.unitsForTenant(request.user!.tenant_id!),
    });
  });

  return app;
}

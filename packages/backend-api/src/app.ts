import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { JwtConfig } from '@openclinic/core';
import { env } from './config/env.js';
import { swaggerOptions, swaggerUiOptions } from './config/swagger.js';
import { ProblemDetailsSchema } from './arch/presentation/openapi.schemas.js';
import { UnitOfWork } from './arch/infrastructure/database/uow.js';
import { registerAuthRoutes } from './arch/presentation/auth.router.js';
import { registerGroupRoutes } from './arch/presentation/group.router.js';
import { registerIamRoutes } from './arch/presentation/iam.router.js';
import { registerApplicationRoutes } from './arch/presentation/application.router.js';
import { registerTenantRoutes } from './arch/presentation/tenant.router.js';
import { errorHandler } from './arch/presentation/error-handler.js';

export interface BuildAppOptions {
  jwtConfig?: JwtConfig;
  uow?: UnitOfWork;
  dbUrl?: string;
  enableSwaggerUi?: boolean;
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

  // JWT Configuration
  const jwtConfig: JwtConfig = options.jwtConfig ?? {
    secretKey: env.JWT_SECRET_KEY,
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

  // Base Plugins
  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);

  // OpenAPI Swagger & Swagger UI
  await app.register(swagger, swaggerOptions);
  if (options.enableSwaggerUi !== false) {
    await app.register(swaggerUi, swaggerUiOptions);
  }

  // Error Handler
  app.setErrorHandler(errorHandler);

  // Health Check Endpoint
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health & Monitoring'],
        summary: 'API Health Check',
        description: 'Checks the operational status and connectivity of the API',
        response: {
          200: {
            description: 'Service is operational',
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

  // Security, Identity, and Governance Routes
  registerAuthRoutes(app, uow, jwtConfig);
  registerGroupRoutes(app, uow, jwtConfig);
  registerIamRoutes(app, uow, jwtConfig);
  registerApplicationRoutes(app, uow, jwtConfig);
  registerTenantRoutes(app, uow, jwtConfig);

  return app;
}

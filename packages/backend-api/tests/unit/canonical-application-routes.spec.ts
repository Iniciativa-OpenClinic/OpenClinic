import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { ProblemDetailsSchema } from '../../src/arch/presentation/openapi.schemas.js';
import { registerApplicationRoutes } from '../../src/arch/presentation/application.router.js';
import type { IAMUnitOfWork } from '../../src/arch/domain/repositories.js';

function fixture() {
  const app = Fastify();
  app.addSchema(ProblemDetailsSchema);
  const uow = {
    applications: { getDefaultApplication: async () => ({ appName: 'Derived App', appVersion: '1.0.0', defaultLocale: 'pt-BR', defaultSupportedLocales: ['pt-BR', 'en-US'], defaultTimezone: 'UTC', defaultDialingCode: '55', defaultAcceptedLoginMethods: ['CPF'], defaultSessionTimeoutMinutes: 30 }) },
    tenants: { getDefaultTenant: async () => null },
  } as unknown as IAMUnitOfWork;
  registerApplicationRoutes(app, uow, {secretKey:'synthetic-key-for-canonical-contract-tests',accessTokenExpireMinutes:15,refreshTokenExpireDays:7});
  return app;
}

describe('Canonical application contracts', () => {
  it('serves one camelCase public config including supported locales', async () => {
    const app = fixture();
    try {
      const response = await app.inject({method:'GET',url:'/api/v1/public/config'});
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({appName:'Derived App',tenantName:'Derived App',supportedLocales:['pt-BR','en-US']});
      expect(Object.keys(response.json()).some(key => key.includes('_'))).toBe(false);
      expect(response.json()).not.toHaveProperty('defaultSupportedLocales');
    } finally { await app.close(); }
  });
  it('does not register obsolete public or system aliases', async () => {
    const app = fixture();
    try {
      for (const url of ['/api/v1/arch/public/application','/api/v1/system/public/application','/api/v1/system/platform/application','/api/v1/system/application-configs/current']) {
        expect((await app.inject({method:'GET',url})).statusCode).toBe(404);
        expect((await app.inject({method:'PUT',url,payload:{}})).statusCode).toBe(404);
      }
    } finally { await app.close(); }
  });
});

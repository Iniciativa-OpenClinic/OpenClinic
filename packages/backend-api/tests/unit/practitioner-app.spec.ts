import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAccessToken, UserRole } from '@openclinic/core';
import { buildApp } from '../../src/app.js';
import type { UnitOfWork } from '../../src/arch/infrastructure/database/uow.js';

vi.mock('../../src/config/env.js', () => ({ env: {
  DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/unused',
  JWT_KEY: 'test-key-with-at-least-thirty-two-characters',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
} }));

const jwtConfig = { secretKey: 'practitioner-tests-key-with-at-least-thirty-two-characters' };
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

async function fixture(tenantId: string | undefined = 'tenant-a', role: string = UserRole.OWNER) {
  const practitioners = { list: vi.fn().mockResolvedValue({ items: [], total: 0 }) };
  const uow = {
    sessions: { findById: vi.fn().mockResolvedValue({ user_id: 'user-1', revoked_at: null, expires_at: new Date(Date.now() + 60000) }) },
    users: { getById: vi.fn().mockResolvedValue({ id: 'user-1', role, tenant_id: tenantId, is_active: true }) },
    resources: { listAll: vi.fn().mockResolvedValue([]) },
    groups: { getUserGroups: vi.fn().mockResolvedValue([]) },
    permissions: { getAclMap: vi.fn().mockResolvedValue([]) },
    practitionersForTenant: vi.fn().mockReturnValue(practitioners),
  };
  const app = await buildApp({ uow: uow as unknown as UnitOfWork, jwtConfig });
  apps.push(app);
  const token = createAccessToken({ sub: 'user-1', sid: 'session-1', role, email: 'test@example.com', tenant_id: tenantId }, jwtConfig);
  return { app, uow, headers: { authorization: `Bearer ${token}` } };
}

describe('Practitioner application integration', () => {
  it('registers all five endpoints in the served OpenAPI document', async () => {
    const { app } = await fixture();
    const response = await app.inject('/docs/json');
    expect(response.statusCode).toBe(200);
    const paths = response.json().paths;
    for (const [path, methods] of [
      ['/api/v1/business/practitioners', ['get', 'post']],
      ['/api/v1/business/practitioners/{id}', ['get', 'put', 'delete']],
    ] as const) {
      for (const method of methods) {
        expect(paths[path][method].security).toEqual([{ BearerAuth: [] }]);
        expect(paths[path][method].summary).toBeTruthy();
        expect(paths[path][method].responses['401']).toBeDefined();
      }
    }
    expect((await app.inject('/docs/')).statusCode).toBe(200);
  });

  it('requires authentication before accessing the repository', async () => {
    const { app, uow } = await fixture();
    expect((await app.inject('/api/v1/business/practitioners')).statusCode).toBe(401);
    expect(uow.practitionersForTenant).not.toHaveBeenCalled();
  });

  it('selects the authenticated tenant repository', async () => {
    const { app, uow, headers } = await fixture();
    const response = await app.inject({ url: '/api/v1/business/practitioners', headers });
    expect(response.statusCode).toBe(200);
    expect(uow.practitionersForTenant).toHaveBeenCalledWith('tenant-a');
  });

  it('rejects a user without practitioner permissions', async () => {
    const { app, uow, headers } = await fixture('tenant-a', UserRole.USER);
    expect((await app.inject({ url: '/api/v1/business/practitioners', headers })).statusCode).toBe(403);
    expect(uow.practitionersForTenant).not.toHaveBeenCalled();
  });

  it('rejects requests without a tenant even for an owner', async () => {
    const { app, uow, headers } = await fixture('');
    expect((await app.inject({ url: '/api/v1/business/practitioners', headers })).statusCode).toBe(403);
    expect(uow.practitionersForTenant).not.toHaveBeenCalled();
  });

  it('rejects a stale tenant claim after the user loses its tenant', async () => {
    const { app, uow, headers } = await fixture('tenant-a');
    uow.users.getById.mockResolvedValue({ id: 'user-1', role: UserRole.OWNER, tenant_id: undefined, is_active: true });
    expect((await app.inject({ url: '/api/v1/business/practitioners', headers })).statusCode).toBe(403);
    expect(uow.practitionersForTenant).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { PostgresUnitRepository } from '../../src/arch/infrastructure/database/unit.repository.js';

function fixture() {
  const query = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
  };
  const db = { select: vi.fn(() => query), update: vi.fn(() => query) };
  const repository = new PostgresUnitRepository(db as unknown as PostgresJsDatabase, 'tenant-a');
  const predicate = () => new PgDialect().sqlToQuery(query.where.mock.calls[0][0] as SQL);
  return { repository, query, predicate };
}

describe('Unit repository isolation', () => {
  it('requires an explicit tenant', () => {
    expect(() => new PostgresUnitRepository({} as PostgresJsDatabase, '')).toThrow('requires a tenant');
  });

  it('scopes organization lookup to the tenant and excludes deleted organizations', async () => {
    const { repository, predicate } = fixture();
    expect(await repository.organizationExists('organization-1')).toBe(false);
    const { sql, params } = predicate();
    expect(sql).toContain('"app_organizations"."tenant_id" =');
    expect(sql).toContain('"app_organizations"."deleted_at" is null');
    expect(params).toEqual(['organization-1', 'tenant-a']);
  });

  it.each(['getById', 'update', 'softDelete'] as const)('scopes %s to a non-deleted unit in the tenant', async (operation) => {
    const { repository, predicate, query } = fixture();
    if (operation === 'update') await repository.update('unit-1', { name: 'Centro' });
    else await repository[operation]('unit-1');
    const { sql, params } = predicate();
    expect(sql).toContain('"app_organization_units"."tenant_id" =');
    expect(sql).toContain('"app_organization_units"."deleted_at" is null');
    expect(sql).toContain('"app_organization_units"."id" =');
    expect(params).toEqual(['tenant-a', 'unit-1']);
    if (operation === 'softDelete') {
      expect(query.set).toHaveBeenCalledWith({ is_active: false, deleted_at: expect.any(Date), updated_at: expect.any(Date) });
    }
  });
});

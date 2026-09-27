import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantRepository } from '../../src/arch/infrastructure/database/tenant.repository.js';
import type { TenantEntity } from '../../src/arch/domain/entities.js';
import { TenantStatus } from '@openclinic/core';
import { CreateTenantSchema, UpdateTenantSchema } from '../../src/arch/domain/tenant.dto.js';

describe('TenantRepository', () => {
  let mockDb: any;
  let repo: TenantRepository;

  const sampleTenant: TenantEntity = {
    id: 'tenant-1',
    name: 'Hospital São Lucas',
    slug: 'sao-lucas',
    status: TenantStatus.ACTIVE,
    tax_id: '11222333000181',
    cnpj: '11222333000181',
    contact_name: 'Dr. Roberto Santos',
    contact_title: 'Diretor Clínico',
    contact_email: 'roberto.santos@saolucas.med.br',
    contact_phone: '(11) 98765-4321',
    postal_code: '01310100',
    street: 'Av. Paulista',
    number: '1000',
    complement: 'Andar 10',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    country: 'BRA',
    is_default: true,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    repo = new TenantRepository(mockDb);
  });

  it('should list all active tenants ordered by is_default and name', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([sampleTenant]),
    };
    mockDb.select.mockReturnValue(chain);

    const list = await repo.listAll();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Hospital São Lucas');
    expect(list[0].is_default).toBe(true);
  });

  it('should get tenant by id', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([sampleTenant]),
    };
    mockDb.select.mockReturnValue(chain);

    const tenant = await repo.getById('tenant-1');
    expect(tenant).toBeDefined();
    expect(tenant?.slug).toBe('sao-lucas');
  });

  it('should get tenant by slug', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([sampleTenant]),
    };
    mockDb.select.mockReturnValue(chain);

    const tenant = await repo.getBySlug('sao-lucas');
    expect(tenant).toBeDefined();
    expect(tenant?.id).toBe('tenant-1');
  });

  it('should create new tenant with id and clear previous default if is_default is true', async () => {
    const updateChain = {
      set: vi.fn().mockResolvedValue([]),
    };
    mockDb.update.mockReturnValue(updateChain);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ ...sampleTenant, id: 'new-tenant-id' }]),
    };
    mockDb.insert.mockReturnValue(insertChain);

    const created = await repo.create({
      name: 'Hospital São Lucas',
      slug: 'sao-lucas',
      is_default: true,
    });

    expect(mockDb.update).toHaveBeenCalled();
    expect(created.id).toBe('new-tenant-id');
  });

  it('should soft delete tenant by setting is_active false and deleted_at', async () => {
    const chain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ ...sampleTenant, is_active: false, deleted_at: new Date() }]),
    };
    mockDb.update.mockReturnValue(chain);

    const result = await repo.delete('tenant-1');
    expect(result).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('Tenant Schemas & CNPJ Sanitization', () => {
  it('should clean and accept valid formatted CNPJ', () => {
    const parsed = CreateTenantSchema.parse({
      name: 'Clínica Integrada',
      slug: 'clinica-integrada',
      cnpj: '11.222.333/0001-81',
      country: 'BRA',
    });

    expect(parsed.cnpj).toBe('11222333000181');
    expect(parsed.country).toBe('BRA');
  });

  it('should accept already cleaned valid CNPJ', () => {
    const parsed = CreateTenantSchema.parse({
      name: 'Clínica Integrada',
      slug: 'clinica-integrada',
      cnpj: '11222333000181',
    });

    expect(parsed.cnpj).toBe('11222333000181');
  });

  it('should accept null or undefined CNPJ', () => {
    const parsedNull = CreateTenantSchema.parse({
      name: 'Clínica Integrada',
      slug: 'clinica-integrada',
      cnpj: null,
    });
    expect(parsedNull.cnpj).toBeNull();

    const parsedUndefined = CreateTenantSchema.parse({
      name: 'Clínica Integrada',
      slug: 'clinica-integrada',
    });
    expect(parsedUndefined.cnpj).toBeUndefined();
  });

  it('should reject invalid CNPJ check digits', () => {
    expect(() =>
      CreateTenantSchema.parse({
        name: 'Clínica Integrada',
        slug: 'clinica-integrada',
        cnpj: '11.222.333/0001-99',
      })
    ).toThrow();
  });

  it('should accept partial update with cleaned CNPJ in UpdateTenantSchema', () => {
    const parsed = UpdateTenantSchema.parse({
      cnpj: '11.222.333/0001-81',
      state: 'São Paulo',
      country: 'Brasil',
    });

    expect(parsed.cnpj).toBe('11222333000181');
    expect(parsed.state).toBe('São Paulo');
    expect(parsed.country).toBe('Brasil');
  });
});

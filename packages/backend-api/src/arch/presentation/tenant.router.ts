import type { FastifyInstance } from 'fastify';
import {
  type JwtConfig,
  UserRole,
  EntityNotFoundError,
  EntityAlreadyExistsError,
  AccessDeniedError,
  ErrorCode,
  ValidationError,
  TenantStatus,
  Cnpj,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../domain/repositories.js';
import type { TenantEntity } from '../domain/entities.js';
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  type CreateTenantDto,
  type UpdateTenantDto,
  type TenantResponseDTO,
} from '../domain/tenant.dto.js';
import { createAuthenticateJwt } from './middlewares/authenticate-jwt.js';
import { requireRole } from './middlewares/require-permission.js';
import { SecurityBearer, StandardErrorResponses } from './openapi.schemas.js';

export const TENANT_ROUTES = {
  LIST: '/api/v1/arch/tenants',
  GET_BY_ID: '/api/v1/arch/tenants/:id',
  CREATE: '/api/v1/arch/tenants',
  UPDATE: '/api/v1/arch/tenants/:id',
  DELETE: '/api/v1/arch/tenants/:id',
} as const;

export const TENANT_SWAGGER_TAG = 'Architecture & Multi-Tenancy';

function toTenantResponseDTO(entity: TenantEntity): TenantResponseDTO {
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug ?? '',
    status: (entity.status as TenantStatus) ?? TenantStatus.ACTIVE,
    taxId: entity.tax_id ?? null,
    cnpj: entity.cnpj ?? null,
    contactName: entity.contact_name ?? null,
    contactTitle: entity.contact_title ?? null,
    contactEmail: entity.contact_email ?? null,
    contactPhone: entity.contact_phone ?? null,
    postalCode: entity.postal_code ?? null,
    street: entity.street ?? null,
    number: entity.number ?? null,
    complement: entity.complement ?? null,
    neighborhood: entity.neighborhood ?? null,
    city: entity.city ?? null,
    state: entity.state ?? null,
    country: entity.country ?? null,
    isDefault: Boolean(entity.is_default),
    isActive: Boolean(entity.is_active),
    createdAt: entity.created_at ? new Date(entity.created_at).toISOString() : new Date().toISOString(),
    updatedAt: entity.updated_at ? new Date(entity.updated_at).toISOString() : new Date().toISOString(),
  };
}

function fromTenantDto(dto: CreateTenantDto | UpdateTenantDto): Partial<TenantEntity> {
  const entity: Partial<TenantEntity> = {};
  if (dto.name !== undefined) entity.name = dto.name;
  if (dto.slug !== undefined) entity.slug = dto.slug;
  if (dto.status !== undefined) entity.status = dto.status;
  if (dto.taxId !== undefined) entity.tax_id = dto.taxId;
  if (dto.cnpj !== undefined) entity.cnpj = dto.cnpj ? Cnpj.clean(dto.cnpj) : null;
  if (dto.contactName !== undefined) entity.contact_name = dto.contactName;
  if (dto.contactTitle !== undefined) entity.contact_title = dto.contactTitle;
  if (dto.contactEmail !== undefined) entity.contact_email = dto.contactEmail;
  if (dto.contactPhone !== undefined) entity.contact_phone = dto.contactPhone;
  if (dto.postalCode !== undefined) entity.postal_code = dto.postalCode;
  if (dto.street !== undefined) entity.street = dto.street;
  if (dto.number !== undefined) entity.number = dto.number;
  if (dto.complement !== undefined) entity.complement = dto.complement;
  if (dto.neighborhood !== undefined) entity.neighborhood = dto.neighborhood;
  if (dto.city !== undefined) entity.city = dto.city;
  if (dto.state !== undefined) entity.state = dto.state;
  if (dto.country !== undefined) entity.country = dto.country;
  if (dto.isDefault !== undefined) entity.is_default = dto.isDefault;
  if (dto.isActive !== undefined) entity.is_active = dto.isActive;
  return entity;
}

const TenantResponseProperties = {
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string' },
  slug: { type: 'string' },
  status: { type: 'string', enum: Object.values(TenantStatus) },
  taxId: { type: ['string', 'null'] },
  cnpj: { type: ['string', 'null'] },
  contactName: { type: ['string', 'null'] },
  contactTitle: { type: ['string', 'null'] },
  contactEmail: { type: ['string', 'null'] },
  contactPhone: { type: ['string', 'null'] },
  postalCode: { type: ['string', 'null'] },
  street: { type: ['string', 'null'] },
  number: { type: ['string', 'null'] },
  complement: { type: ['string', 'null'] },
  neighborhood: { type: ['string', 'null'] },
  city: { type: ['string', 'null'] },
  state: { type: ['string', 'null'] },
  country: { type: ['string', 'null'] },
  isDefault: { type: 'boolean' },
  isActive: { type: 'boolean' },
  createdAt: { type: 'string' },
  updatedAt: { type: 'string' },
};

export function registerTenantRoutes(
  app: FastifyInstance,
  uow: IAMUnitOfWork,
  jwtConfig: JwtConfig
): void {
  const authenticateJwt = createAuthenticateJwt(jwtConfig, uow);

  // ── GET /api/v1/arch/tenants ──
  app.get(
    TENANT_ROUTES.LIST,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [TENANT_SWAGGER_TAG],
        summary: 'List All Registered Tenants',
        description: 'Returns the list of all tenants registered in sys_tenants ordered by is_default DESC, name ASC.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'List of registered tenants',
            type: 'array',
            items: {
              type: 'object',
              properties: TenantResponseProperties,
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      if (user.role === UserRole.OWNER) {
        const tenants = await uow.tenants.listAll();
        return reply.status(200).send(tenants.map(toTenantResponseDTO));
      }
      if (user.tenant_id) {
        const tenant = await uow.tenants.getById(user.tenant_id);
        return reply.status(200).send(tenant ? [toTenantResponseDTO(tenant)] : []);
      }
      return reply.status(200).send([]);
    }
  );

  // ── GET /api/v1/arch/tenants/:id ──
  app.get<{ Params: { id: string } }>(
    TENANT_ROUTES.GET_BY_ID,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [TENANT_SWAGGER_TAG],
        summary: 'Get Tenant By ID',
        description: 'Returns the specified tenant record by its UUID identifier.',
        security: SecurityBearer,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Tenant details',
            type: 'object',
            properties: TenantResponseProperties,
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      if (user.role !== UserRole.OWNER && user.tenant_id !== request.params.id) {
        throw new AccessDeniedError(ErrorCode.FORBIDDEN);
      }
      const tenant = await uow.tenants.getById(request.params.id);
      if (!tenant) {
        throw new EntityNotFoundError('Tenant', request.params.id);
      }
      return reply.status(200).send(toTenantResponseDTO(tenant));
    }
  );

  // ── POST /api/v1/arch/tenants ──
  app.post(
    TENANT_ROUTES.CREATE,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.OWNER)],
      schema: {
        tags: [TENANT_SWAGGER_TAG],
        summary: 'Create New Tenant',
        description: 'Creates and registers a new organization tenant in the multi-tenant registry.',
        security: SecurityBearer,
        body: {
          type: 'object',
          required: ['name', 'slug'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 255 },
            slug: { type: 'string', minLength: 2, maxLength: 100 },
            status: { type: 'string', enum: Object.values(TenantStatus), default: TenantStatus.ACTIVE },
            taxId: { type: ['string', 'null'] },
            cnpj: { type: ['string', 'null'], maxLength: 18 },
            contactName: { type: ['string', 'null'], maxLength: 255 },
            contactTitle: { type: ['string', 'null'], maxLength: 100 },
            contactEmail: { type: ['string', 'null'], maxLength: 255 },
            contactPhone: { type: ['string', 'null'], maxLength: 20 },
            postalCode: { type: ['string', 'null'], maxLength: 20 },
            street: { type: ['string', 'null'], maxLength: 255 },
            number: { type: ['string', 'null'], maxLength: 20 },
            complement: { type: ['string', 'null'], maxLength: 100 },
            neighborhood: { type: ['string', 'null'], maxLength: 100 },
            city: { type: ['string', 'null'], maxLength: 100 },
            state: { type: ['string', 'null'], maxLength: 100 },
            country: { type: ['string', 'null'], maxLength: 50 },
            isDefault: { type: 'boolean', default: false },
            isActive: { type: 'boolean', default: true },
          },
        },
        response: {
          201: {
            description: 'Tenant created successfully',
            type: 'object',
            properties: {
              code: { type: 'string', example: 'CREATED' },
              message: { type: 'string', example: 'Tenant created successfully' },
              data: {
                type: 'object',
                properties: TenantResponseProperties,
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const parsedBody = CreateTenantSchema.parse(request.body);

      const existingBySlug = await uow.tenants.getBySlug(parsedBody.slug);
      if (existingBySlug) {
        throw new EntityAlreadyExistsError('Tenant', 'slug', parsedBody.slug);
      }

      const entityData = fromTenantDto(parsedBody);
      const created = await uow.tenants.create(entityData);

      return reply.status(201).send({
        code: 'CREATED',
        message: 'Tenant created successfully',
        data: toTenantResponseDTO(created),
      });
    }
  );

  // ── PUT /api/v1/arch/tenants/:id ──
  app.put<{ Params: { id: string } }>(
    TENANT_ROUTES.UPDATE,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [TENANT_SWAGGER_TAG],
        summary: 'Update Tenant Details',
        description: 'Updates configuration, fiscal data, and operational status of an existing tenant.',
        security: SecurityBearer,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 255 },
            slug: { type: 'string', minLength: 2, maxLength: 100 },
            status: { type: 'string', enum: Object.values(TenantStatus) },
            taxId: { type: ['string', 'null'] },
            cnpj: { type: ['string', 'null'], maxLength: 18 },
            contactName: { type: ['string', 'null'], maxLength: 255 },
            contactTitle: { type: ['string', 'null'], maxLength: 100 },
            contactEmail: { type: ['string', 'null'], maxLength: 255 },
            contactPhone: { type: ['string', 'null'], maxLength: 20 },
            postalCode: { type: ['string', 'null'], maxLength: 20 },
            street: { type: ['string', 'null'], maxLength: 255 },
            number: { type: ['string', 'null'], maxLength: 20 },
            complement: { type: ['string', 'null'], maxLength: 100 },
            neighborhood: { type: ['string', 'null'], maxLength: 100 },
            city: { type: ['string', 'null'], maxLength: 100 },
            state: { type: ['string', 'null'], maxLength: 100 },
            country: { type: ['string', 'null'], maxLength: 50 },
            isDefault: { type: 'boolean' },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Tenant updated successfully',
            type: 'object',
            properties: {
              code: { type: 'string', example: 'OK' },
              message: { type: 'string', example: 'Tenant updated successfully' },
              data: {
                type: 'object',
                properties: TenantResponseProperties,
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params;
      if (user.role !== UserRole.OWNER && user.tenant_id !== id) {
        throw new AccessDeniedError(ErrorCode.FORBIDDEN);
      }
      const existing = await uow.tenants.getById(id);
      if (!existing) {
        throw new EntityNotFoundError('Tenant', id);
      }

      const parsedBody = UpdateTenantSchema.parse(request.body);

      if (parsedBody.slug && parsedBody.slug !== existing.slug) {
        const slugCheck = await uow.tenants.getBySlug(parsedBody.slug);
        if (slugCheck && slugCheck.id !== id) {
          throw new EntityAlreadyExistsError('Tenant', 'slug', parsedBody.slug);
        }
      }

      const entityData = fromTenantDto(parsedBody);
      const updated = await uow.tenants.update(id, entityData);

      return reply.status(200).send({
        code: 'OK',
        message: 'Tenant updated successfully',
        data: toTenantResponseDTO(updated),
      });
    }
  );

  // ── DELETE /api/v1/arch/tenants/:id ──
  app.delete<{ Params: { id: string } }>(
    TENANT_ROUTES.DELETE,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.OWNER)],
      schema: {
        tags: [TENANT_SWAGGER_TAG],
        summary: 'Delete Tenant (Soft Delete)',
        description: 'Soft-deletes a tenant record. The primary default tenant cannot be deleted.',
        security: SecurityBearer,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Tenant deleted successfully',
            type: 'object',
            properties: {
              code: { type: 'string', example: 'OK' },
              message: { type: 'string', example: 'Tenant deleted successfully' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = await uow.tenants.getById(id);
      if (!existing) {
        throw new EntityNotFoundError('Tenant', id);
      }

      if (existing.is_default) {
        throw new ValidationError('tenant', 'Default tenant cannot be deleted');
      }

      await uow.tenants.delete(id);

      return reply.status(200).send({
        code: 'OK',
        message: 'Tenant deleted successfully',
      });
    }
  );
}

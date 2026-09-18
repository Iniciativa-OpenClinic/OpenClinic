import type { FastifyInstance } from 'fastify';
import {
  type JwtConfig,
  type ApplicationPermissionSyncDTO,
  UserRole,
  ApplicationContext,
  ErrorCode,
  AuthenticationError,
} from '@openclinic/core';
import type { IAMUnitOfWork } from '../domain/repositories.js';
import { IAMPermissionService } from '../application/services/iam-permission.service.js';
import { createAuthenticateJwt } from './middlewares/authenticate-jwt.js';
import { requireRole } from './middlewares/require-permission.js';
import { SecurityBearer, StandardErrorResponses } from './openapi.schemas.js';

// ── Centralized HTTP Routes & Constants (No Inline Hardcode) ──
export const IAM_ROUTES = {
  USER_PERMISSIONS: '/api/v1/iam/permissions',
  USER_CAPABILITIES: '/api/v1/iam/capabilities',
  NAVIGATION: '/api/v1/iam/navigation',
  RESOURCES: '/api/v1/iam/resources',
  RESOURCES_TREE: '/api/v1/iam/resources/tree',
  USER_ACL: '/api/v1/iam/permissions/user/:id',
  USER_INHERITED_ACL: '/api/v1/iam/permissions/user/:id/inherited',
  GROUP_ACL: '/api/v1/iam/permissions/group/:id',
  PERMISSIONS_SYNC: '/api/v1/iam/permissions/sync',
} as const;

export const IAM_SWAGGER_TAG = 'IAM & Access Control';
export const DEFAULT_MAX_RESOURCES_LIMIT = 1000;

export const SYNC_STATUS = {
  OK: 'ok',
  ERROR: 'error',
} as const;

export function registerIamRoutes(app: FastifyInstance, uow: IAMUnitOfWork, jwtConfig: JwtConfig): void {
  const authenticateJwt = createAuthenticateJwt(jwtConfig, uow);
  const iamService = new IAMPermissionService(uow);

  // ── 1. Authenticated User Permissions & Capabilities ──

  // GET /api/v1/iam/permissions
  app.get(
    IAM_ROUTES.USER_PERMISSIONS,
    {
      preHandler: [authenticateJwt],
      schema: {
        tags: [IAM_SWAGGER_TAG],
        summary: 'Get Consolidated User Permission Keys',
        description: 'Returns the active set of direct and group-inherited permission keys for the authenticated user.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'List of permission keys',
            type: 'array',
            items: { type: 'string', example: 'users:view' },
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
      const permissions = await iamService.getUserPermissions(user.sub);
      return reply.status(200).send(permissions);
    }
  );

  // GET /api/v1/iam/capabilities
  app.get(
    IAM_ROUTES.USER_CAPABILITIES,
    {
      preHandler: [authenticateJwt],
      schema: {
        tags: [IAM_SWAGGER_TAG],
        summary: 'Get User Capabilities Matrix',
        description: 'Returns the consolidated matrix of authorized resources, routes, permitted actions, and UI metadata.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Matrix of user capabilities',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', example: 'op_schedule' },
                label: { type: 'string', example: 'Appointments & Scheduling' },
                icon: { type: 'string', nullable: true },
                route: { type: 'string', nullable: true },
                resource_type: { type: 'string' },
                context: { type: 'string' },
                actions: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['key', 'label', 'resource_type', 'context', 'actions'],
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
      const capabilities = await iamService.getUserCapabilities(user.sub);
      return reply.status(200).send(capabilities);
    }
  );

  // GET /api/v1/iam/navigation
  app.get(
    IAM_ROUTES.NAVIGATION,
    {
      preHandler: [authenticateJwt],
      schema: {
        tags: [IAM_SWAGGER_TAG],
        summary: 'Get Navigation Menu by Architecture Context',
        description: 'Returns authorized navigation items filtered by application context (ARCH or BUSINESS).',
        security: SecurityBearer,
        querystring: {
          type: 'object',
          properties: {
            context: {
              type: 'string',
              enum: [ApplicationContext.BUSINESS, ApplicationContext.ARCH],
              default: ApplicationContext.BUSINESS,
            },
          },
        },
        response: {
          200: {
            description: 'Filtered navigation menu tree',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                context: { type: 'string' },
                title: { type: 'string' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      item_code: { type: 'string' },
                      label: { type: 'string' },
                      icon: { type: 'string', nullable: true },
                      route: { type: 'string', nullable: true },
                      sort_order: { type: 'number' },
                      min_role: { type: 'string' },
                      context: { type: 'string' },
                      children: { type: 'array', items: { type: 'object', additionalProperties: true } },
                    },
                  },
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
      const query = request.query as { context?: string };
      const rawContext = query.context?.toUpperCase();
      const context =
        rawContext === ApplicationContext.ARCH
          ? ApplicationContext.ARCH
          : ApplicationContext.BUSINESS;
      const menu = await iamService.getNavigationMenu(user.sub, context);
      return reply.status(200).send(menu);
    }
  );

  // ── 2. System Resource Management (ADMIN / OWNER) ──

  // GET /api/v1/iam/resources
  app.get(
    IAM_ROUTES.RESOURCES,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [IAM_SWAGGER_TAG],
        summary: 'List All System Resources',
        description: 'Returns the flat list of all manageable resources within the IAM subsystem.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'List of application resources',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                item_code: { type: 'string' },
                parent_id: { type: 'string', format: 'uuid', nullable: true },
                resource_type: { type: 'string' },
                context: { type: 'string' },
                label_key: { type: 'string' },
                route: { type: 'string', nullable: true },
                icon: { type: 'string', nullable: true },
                sort_order: { type: 'number', nullable: true },
                min_role: { type: 'string', nullable: true },
                description: { type: 'string', nullable: true },
                is_active: { type: 'boolean' },
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (_request, reply) => {
      const resources = await uow.resources.listAll(DEFAULT_MAX_RESOURCES_LIMIT);
      return reply.status(200).send(resources);
    }
  );

  // GET /api/v1/iam/resources/tree
  app.get(
    IAM_ROUTES.RESOURCES_TREE,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [IAM_SWAGGER_TAG],
        summary: 'Get Hierarchical Resource Tree',
        description: 'Returns hierarchical resource tree structured with parents and children for permission management.',
        security: SecurityBearer,
        querystring: {
          type: 'object',
          properties: {
            context: {
              type: 'string',
              enum: [ApplicationContext.BUSINESS, ApplicationContext.ARCH],
              default: ApplicationContext.BUSINESS,
            },
          },
        },
        response: {
          200: {
            description: 'Hierarchical tree of application resources',
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                item_code: { type: 'string' },
                parent_id: { type: 'string', format: 'uuid', nullable: true },
                resource_type: { type: 'string' },
                context: { type: 'string' },
                label_key: { type: 'string' },
                route: { type: 'string', nullable: true },
                icon: { type: 'string', nullable: true },
                sort_order: { type: 'number', nullable: true },
                min_role: { type: 'string', nullable: true },
                description: { type: 'string', nullable: true },
                is_active: { type: 'boolean' },
                children: { type: 'array', items: { type: 'object', additionalProperties: true } },
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const query = request.query as { context?: string };
      const rawContext = query.context?.toUpperCase();
      const context =
        rawContext === ApplicationContext.ARCH
          ? ApplicationContext.ARCH
          : ApplicationContext.BUSINESS;
      const tree = await uow.resources.getTree(context);
      return reply.status(200).send(tree);
    }
  );

  // ── 3. ACL Management & Synchronization (ADMIN / OWNER) ──

  // GET /api/v1/iam/permissions/user/:id
  app.get(
    IAM_ROUTES.USER_ACL,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [IAM_SWAGGER_TAG],
        summary: 'Get Direct User ACL Permissions',
        description: 'Returns permissions directly granted to a specific user.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Direct permissions for the user',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                resource_key: { type: 'string' },
                actions: { type: 'array', items: { type: 'string' } },
                effect: { type: 'string' },
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const acl = await iamService.getUserAcl(id);
      return reply.status(200).send(acl);
    }
  );

  // GET /api/v1/iam/permissions/user/:id/inherited
  app.get(
    IAM_ROUTES.USER_INHERITED_ACL,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [IAM_SWAGGER_TAG],
        summary: 'Get Inherited User ACL Permissions',
        description: 'Returns permissions inherited by a user through their group memberships.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Inherited permissions for the user',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                resource_key: { type: 'string' },
                actions: { type: 'array', items: { type: 'string' } },
                effect: { type: 'string' },
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const acl = await iamService.getUserInheritedAcl(id);
      return reply.status(200).send(acl);
    }
  );

  // GET /api/v1/iam/permissions/group/:id
  app.get(
    IAM_ROUTES.GROUP_ACL,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [IAM_SWAGGER_TAG],
        summary: 'Get Group ACL Permissions',
        description: 'Returns permissions configured for a specific group.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Permissions for the group',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                resource_key: { type: 'string' },
                actions: { type: 'array', items: { type: 'string' } },
                effect: { type: 'string' },
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const acl = await iamService.getGroupAcl(id);
      return reply.status(200).send(acl);
    }
  );

  // POST /api/v1/iam/permissions/sync
  app.post(
    IAM_ROUTES.PERMISSIONS_SYNC,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [IAM_SWAGGER_TAG],
        summary: 'Batch Synchronize ACL Permissions Matrix',
        description: 'Saves the complete ACL permission matrix in batch for a user or group.',
        security: SecurityBearer,
        body: {
          type: 'object',
          required: ['permissions'],
          properties: {
            user_id: { type: 'string', format: 'uuid', nullable: true },
            group_id: { type: 'string', format: 'uuid', nullable: true },
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['resource_key', 'actions'],
                properties: {
                  id: { type: 'string', nullable: true },
                  resource_key: { type: 'string' },
                  actions: { type: 'array', items: { type: 'string' } },
                  effect: { type: 'string' },
                },
              },
            },
          },
        },
        response: {
          200: {
            description: 'Status of the sync operation',
            type: 'object',
            properties: {
              status: { type: 'string', example: SYNC_STATUS.OK },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const payload = request.body as ApplicationPermissionSyncDTO;
      const requesterRole = request.user?.role as UserRole | undefined;
      const success = await iamService.syncPermissions(payload, requesterRole);
      return reply.status(200).send({ status: success ? SYNC_STATUS.OK : SYNC_STATUS.ERROR });
    }
  );
}

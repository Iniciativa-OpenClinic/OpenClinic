import type { FastifyInstance } from 'fastify';
import { type JwtConfig, UserRole, AUDIT_CONSTANTS } from '@openclinic/core';
import type { IAMUnitOfWork } from '../domain/repositories.js';
import { ListGroupsUseCase } from '../application/use-cases/list-groups.use-case.js';
import { CreateGroupUseCase } from '../application/use-cases/create-group.use-case.js';
import { UpdateGroupUseCase } from '../application/use-cases/update-group.use-case.js';
import { DeleteGroupUseCase } from '../application/use-cases/delete-group.use-case.js';
import { GetGroupMembersUseCase } from '../application/use-cases/get-group-members.use-case.js';
import { AddGroupMemberUseCase } from '../application/use-cases/add-group-member.use-case.js';
import { RemoveGroupMemberUseCase } from '../application/use-cases/remove-group-member.use-case.js';
import { GetUserGroupsUseCase } from '../application/use-cases/get-user-groups.use-case.js';
import { AddUserToGroupUseCase } from '../application/use-cases/add-user-to-group.use-case.js';
import { RemoveUserFromGroupUseCase } from '../application/use-cases/remove-user-from-group.use-case.js';
import {
  CreateGroupRequestSchema,
  UpdateGroupRequestSchema,
  AddGroupMemberRequestSchema,
  AddUserToGroupRequestSchema,
} from './group.schemas.js';
import { createAuthenticateJwt } from './middlewares/authenticate-jwt.js';
import { requireRole } from './middlewares/require-permission.js';
import { SecurityBearer, StandardErrorResponses, createActionResponseSchema } from './openapi.schemas.js';

export function registerGroupRoutes(app: FastifyInstance, uow: IAMUnitOfWork, jwtConfig: JwtConfig): void {
  const authenticateJwt = createAuthenticateJwt(jwtConfig, uow);

  // ── USER GROUPS MANAGEMENT (ADMIN & OWNER) ──

  // GET /api/v1/iam/groups
  app.get(
    '/api/v1/iam/groups',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'List All Groups',
        description: 'Returns list of registered groups with count of linked members.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Groups list',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                is_active: { type: 'boolean' },
                is_default: { type: 'boolean' },
                member_count: { type: 'integer' },
                created_at: { type: 'string' },
                updated_at: { type: 'string', nullable: true },
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (_request, reply) => {
      const useCase = new ListGroupsUseCase(uow);
      const result = await useCase.execute();
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/iam/groups
  app.post(
    '/api/v1/iam/groups',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'Create Clinical/Functional Group',
        description: 'Registers a new group for user aggregation and ACL permissions inheritance.',
        security: SecurityBearer,
        body: {
          type: 'object',
          required: ['name', 'description'],
          properties: {
            name: { type: 'string', minLength: 2, example: 'Clinical Staff - Cardiology' },
            description: { type: 'string', minLength: 1, example: 'Specialist physicians with access to cardiology reports' },
            is_active: { type: 'boolean', default: true },
          },
        },
        response: {
          201: createActionResponseSchema(
            {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              is_active: { type: 'boolean' },
              is_default: { type: 'boolean' },
              member_count: { type: 'integer' },
              tenant_id: { type: 'string', format: 'uuid', nullable: true },
              created_at: { type: 'string' },
              updated_at: { type: 'string', nullable: true },
            },
            'Group created successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const body = CreateGroupRequestSchema.parse(request.body);
      const username = request.user?.email ?? AUDIT_CONSTANTS.SYSTEM_OPERATOR;
      const useCase = new CreateGroupUseCase(uow);
      const result = await useCase.execute(body, request.ip, username);
      return reply.status(201).send(result);
    }
  );

  // PUT /api/v1/iam/groups/:id
  app.put(
    '/api/v1/iam/groups/:id',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'Update Group',
        description: 'Updates name, description, and active status of an existing group.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2 },
            description: { type: 'string' },
            is_active: { type: 'boolean' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              is_active: { type: 'boolean' },
              is_default: { type: 'boolean' },
              member_count: { type: 'integer' },
              tenant_id: { type: 'string', format: 'uuid', nullable: true },
              created_at: { type: 'string' },
              updated_at: { type: 'string', nullable: true },
            },
            'Group updated successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = UpdateGroupRequestSchema.parse(request.body);
      const username = request.user?.email ?? AUDIT_CONSTANTS.SYSTEM_OPERATOR;
      const useCase = new UpdateGroupUseCase(uow);
      const result = await useCase.execute(id, body, request.ip, username);
      return reply.status(200).send(result);
    }
  );

  // DELETE /api/v1/iam/groups/:id
  app.delete(
    '/api/v1/iam/groups/:id',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'Delete Group',
        description: 'Deletes a user group and unbinds its associated permissions.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
            'Group deleted successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const username = request.user?.email ?? AUDIT_CONSTANTS.SYSTEM_OPERATOR;
      const useCase = new DeleteGroupUseCase(uow);
      const result = await useCase.execute(id, request.ip, username);
      return reply.status(200).send(result);
    }
  );

  // ── GROUP-CENTRIC MEMBERSHIP ──

  // GET /api/v1/iam/groups/:id/members
  app.get(
    '/api/v1/iam/groups/:id/members',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'List Group Members',
        description: 'Returns users belonging to the group and users available for association.',
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
            type: 'object',
            properties: {
              group: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  is_active: { type: 'boolean' },
                  is_default: { type: 'boolean' },
                  member_count: { type: 'number' },
                  tenant_id: { type: 'string', format: 'uuid', nullable: true },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' },
                },
              },
              members: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    username: { type: 'string' },
                    full_name: { type: 'string' },
                    display_name: { type: 'string', nullable: true },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    is_active: { type: 'boolean' },
                    created_at: { type: 'string' },
                    updated_at: { type: 'string' },
                  },
                },
              },
              available_users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    username: { type: 'string' },
                    full_name: { type: 'string' },
                    display_name: { type: 'string', nullable: true },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    is_active: { type: 'boolean' },
                    created_at: { type: 'string' },
                    updated_at: { type: 'string' },
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
      const { id } = request.params as { id: string };
      const useCase = new GetGroupMembersUseCase(uow);
      const result = await useCase.execute(id);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/iam/groups/:id/members
  app.post(
    '/api/v1/iam/groups/:id/members',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'Add User to Group',
        description: 'Associates an existing user with the group to grant inherited permissions.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['user_id'],
          properties: {
            user_id: { type: 'string', format: 'uuid', example: 'd3b07384-d113-40f4-80f0-8c29bf587f7d' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              groupId: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
            },
            'Member added to group successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = AddGroupMemberRequestSchema.parse(request.body);
      const username = request.user?.email ?? AUDIT_CONSTANTS.SYSTEM_OPERATOR;
      const useCase = new AddGroupMemberUseCase(uow);
      const result = await useCase.execute(id, body.user_id, request.ip, username);
      return reply.status(200).send(result);
    }
  );

  // DELETE /api/v1/iam/groups/:id/members/:userId
  app.delete(
    '/api/v1/iam/groups/:id/members/:userId',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'Remove User from Group',
        description: 'Disassociates a user from the group.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              groupId: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
            },
            'Member removed from group successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };
      const username = request.user?.email ?? AUDIT_CONSTANTS.SYSTEM_OPERATOR;
      const useCase = new RemoveGroupMemberUseCase(uow);
      const result = await useCase.execute(id, userId, request.ip, username);
      return reply.status(200).send(result);
    }
  );

  // ── USER-CENTRIC GROUP MEMBERSHIP ──

  // GET /api/v1/iam/users/:id/groups
  app.get(
    '/api/v1/iam/users/:id/groups',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'List User Groups',
        description: 'Returns list of groups the user belongs to and available groups.',
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
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  username: { type: 'string' },
                  full_name: { type: 'string' },
                  display_name: { type: 'string', nullable: true },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  is_active: { type: 'boolean' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' },
                },
              },
              groups: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    is_active: { type: 'boolean' },
                    is_default: { type: 'boolean' },
                    member_count: { type: 'number' },
                    created_at: { type: 'string' },
                    updated_at: { type: 'string' },
                  },
                },
              },
              available_groups: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    is_active: { type: 'boolean' },
                    is_default: { type: 'boolean' },
                    member_count: { type: 'number' },
                    created_at: { type: 'string' },
                    updated_at: { type: 'string' },
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
      const { id } = request.params as { id: string };
      const useCase = new GetUserGroupsUseCase(uow);
      const result = await useCase.execute(id);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/iam/users/:id/groups
  app.post(
    '/api/v1/iam/users/:id/groups',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'Bind User to Group',
        description: 'Adds a group to the user groups list.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['group_id'],
          properties: {
            group_id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              userId: { type: 'string', format: 'uuid' },
              groupId: { type: 'string', format: 'uuid' },
            },
            'User added to group successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = AddUserToGroupRequestSchema.parse(request.body);
      const username = request.user?.email ?? AUDIT_CONSTANTS.SYSTEM_OPERATOR;
      const useCase = new AddUserToGroupUseCase(uow);
      const result = await useCase.execute(id, body.group_id, request.ip, username);
      return reply.status(200).send(result);
    }
  );

  // DELETE /api/v1/iam/users/:id/groups/:groupId
  app.delete(
    '/api/v1/iam/users/:id/groups/:groupId',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Clinical Groups (IAM)'],
        summary: 'Unbind User from Group',
        description: 'Removes the binding between user and group.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id', 'groupId'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            groupId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              userId: { type: 'string', format: 'uuid' },
              groupId: { type: 'string', format: 'uuid' },
            },
            'User removed from group successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id, groupId } = request.params as { id: string; groupId: string };
      const username = request.user?.email ?? AUDIT_CONSTANTS.SYSTEM_OPERATOR;
      const useCase = new RemoveUserFromGroupUseCase(uow);
      const result = await useCase.execute(id, groupId, request.ip, username);
      return reply.status(200).send(result);
    }
  );
}

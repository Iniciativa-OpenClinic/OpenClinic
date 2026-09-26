import type { FastifyInstance } from 'fastify';
import { UserRole, type JwtConfig } from '@openclinic/core';
import type { IAMUnitOfWork } from '../domain/repositories.js';
import { createAuthenticateJwt } from './middlewares/authenticate-jwt.js';
import { requireRole } from './middlewares/require-permission.js';
import { SecurityBearer, StandardErrorResponses, createActionResponseSchema } from './openapi.schemas.js';
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  AdminResetPasswordRequestSchema,
} from './auth.schemas.js';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js';
import { CreateUserAdminUseCase } from '../application/use-cases/create-user-admin.use-case.js';
import { UpdateUserAdminUseCase } from '../application/use-cases/update-user-admin.use-case.js';
import { AdminResetPasswordUseCase } from '../application/use-cases/admin-reset-password.use-case.js';
import { ToggleUserStatusUseCase } from '../application/use-cases/toggle-user-status.use-case.js';
import { DeleteUserAdminUseCase } from '../application/use-cases/delete-user-admin.use-case.js';
import { UnlockUserUseCase } from '../application/use-cases/unlock-user.use-case.js';

export const USER_ROUTES = {
  USERS: '/api/v1/iam/users',
  USER_BY_ID: '/api/v1/iam/users/:id',
  RESET_PASSWORD: '/api/v1/iam/users/:id/reset-password',
  STATUS: '/api/v1/iam/users/:id/status',
  UNLOCK: '/api/v1/iam/users/:id/unlock',
} as const;

export const USER_SWAGGER_TAG = 'User Management (IAM)';

export function registerUserRoutes(app: FastifyInstance, uow: IAMUnitOfWork, jwtConfig: JwtConfig): void {
  const authenticateJwt = createAuthenticateJwt(jwtConfig, uow);

  // GET /api/v1/iam/users
  app.get(
    USER_ROUTES.USERS,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [USER_SWAGGER_TAG],
        summary: 'List All Users',
        description: 'Returns list of registered users with roles, active status, and lockout state.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Users list',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                username: { type: 'string' },
                email: { type: 'string' },
                cpf: { type: 'string', nullable: true },
                full_name: { type: 'string' },
                job_title: { type: 'string', nullable: true },
                role: { type: 'string', enum: ['OWNER', 'ADMIN', 'USER'] },
                is_active: { type: 'boolean' },
                is_locked: { type: 'boolean' },
                created_at: { type: 'string', format: 'date-time' },
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const requesterRole = request.user?.role as UserRole | undefined;
      const requesterTenantId = request.user?.tenant_id;
      const useCase = new ListUsersUseCase(uow);
      const result = await useCase.execute(0, 100, requesterRole, requesterTenantId);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/iam/users
  app.post(
    USER_ROUTES.USERS,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [USER_SWAGGER_TAG],
        summary: 'Create New User (Admin)',
        description: 'Creates a new user in the clinic with designated role and initial password.',
        security: SecurityBearer,
        body: {
          type: 'object',
          required: ['email', 'username', 'full_name', 'password', 'role'],
          properties: {
            email: { type: 'string', format: 'email', example: 'enfermeiro.silva@openclinic.local' },
            username: { type: 'string', minLength: 3, example: 'enf.silva' },
            cpf: { type: 'string', nullable: true, example: '52998224725' },
            full_name: { type: 'string', example: 'Carlos Silva' },
            job_title: { type: 'string', example: 'Enfermeiro Chefe' },
            password: { type: 'string', minLength: 8, format: 'password', example: 'temp1234' },
            role: { type: 'string', enum: ['OWNER', 'ADMIN', 'USER'], example: 'USER' },
            is_active: { type: 'boolean', default: true },
          },
        },
        response: {
          201: createActionResponseSchema(
            {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              email: { type: 'string' },
              cpf: { type: 'string', nullable: true },
              full_name: { type: 'string' },
              display_name: { type: 'string', nullable: true },
              job_title: { type: 'string', nullable: true },
              role: { type: 'string' },
              is_active: { type: 'boolean' },
            },
            'User created successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const body = CreateUserRequestSchema.parse(request.body);
      const creatorRole = request.user!.role as UserRole;
      const creatorTenantId = request.user?.tenant_id;
      const useCase = new CreateUserAdminUseCase(uow);
      const result = await useCase.execute(creatorRole, body, request.ip, creatorTenantId);
      return reply.status(201).send(result);
    }
  );

  // PUT /api/v1/iam/users/:id
  app.put(
    USER_ROUTES.USER_BY_ID,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [USER_SWAGGER_TAG],
        summary: 'Update User Details',
        description: 'Updates profile information and RBAC role of an existing user.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'User ID' },
          },
        },
        body: {
          type: 'object',
          required: ['email', 'username', 'full_name', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3 },
            cpf: { type: 'string', nullable: true, example: '52998224725' },
            full_name: { type: 'string' },
            job_title: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['OWNER', 'ADMIN', 'USER'] },
            is_active: { type: 'boolean' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              email: { type: 'string' },
              cpf: { type: 'string', nullable: true },
              full_name: { type: 'string' },
              display_name: { type: 'string', nullable: true },
              job_title: { type: 'string', nullable: true },
              role: { type: 'string' },
              is_active: { type: 'boolean' },
            },
            'User updated successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = UpdateUserRequestSchema.parse(request.body);
      const creatorRole = request.user!.role as UserRole;
      const creatorTenantId = request.user?.tenant_id;
      const useCase = new UpdateUserAdminUseCase(uow);
      const result = await useCase.execute(creatorRole, id, body, request.ip, creatorTenantId);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/iam/users/:id/reset-password
  app.post(
    USER_ROUTES.RESET_PASSWORD,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [USER_SWAGGER_TAG],
        summary: 'Admin Reset User Password',
        description: 'Allows Administrator/Owner to set a new password directly for another user.',
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
          required: ['new_password'],
          properties: {
            new_password: { type: 'string', minLength: 8, format: 'password' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              id: { type: 'string', format: 'uuid' },
            },
            'User password reset by administrator'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = AdminResetPasswordRequestSchema.parse(request.body);
      const creatorRole = request.user!.role as UserRole;
      const creatorTenantId = request.user?.tenant_id;
      const useCase = new AdminResetPasswordUseCase(uow);
      const result = await useCase.execute(creatorRole, id, body.new_password, request.ip, creatorTenantId);
      return reply.status(200).send(result);
    }
  );

  // PATCH /api/v1/iam/users/:id/status
  app.patch(
    USER_ROUTES.STATUS,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [USER_SWAGGER_TAG],
        summary: 'Toggle User Active Status',
        description: 'Activates or deactivates user system access.',
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
              is_active: { type: 'boolean' },
            },
            'User active status toggled successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const creatorRole = request.user!.role as UserRole;
      const creatorUserId = request.user!.sub;
      const creatorTenantId = request.user?.tenant_id;
      const useCase = new ToggleUserStatusUseCase(uow);
      const result = await useCase.execute(creatorRole, id, request.ip, creatorUserId, creatorTenantId);
      return reply.status(200).send(result);
    }
  );

  // DELETE /api/v1/iam/users/:id
  app.delete(
    USER_ROUTES.USER_BY_ID,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [USER_SWAGGER_TAG],
        summary: 'Delete User',
        description: 'Deletes a user from the system (with protections against self-deletion and owner deletion).',
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
            },
            'User deleted successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const creatorRole = request.user!.role as UserRole;
      const creatorUserId = request.user!.sub;
      const creatorTenantId = request.user?.tenant_id;
      const useCase = new DeleteUserAdminUseCase(uow);
      const result = await useCase.execute(creatorRole, creatorUserId, id, request.ip, creatorTenantId);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/iam/users/:id/unlock
  app.post(
    USER_ROUTES.UNLOCK,
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: [USER_SWAGGER_TAG],
        summary: 'Unlock User Account',
        description: 'Clears security lockout applied after repeated failed login attempts.',
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
            },
            'User account unlocked successfully'
          ),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const creatorRole = request.user!.role as UserRole;
      const creatorTenantId = request.user?.tenant_id;
      const useCase = new UnlockUserUseCase(uow);
      const result = await useCase.execute(creatorRole, id, request.ip, creatorTenantId);
      return reply.status(200).send(result);
    }
  );
}

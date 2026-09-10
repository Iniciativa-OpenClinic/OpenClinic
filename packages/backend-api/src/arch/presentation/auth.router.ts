import type { FastifyInstance } from 'fastify';
import { type JwtConfig, SuccessCode, getSuccessMessage, SupportedLocales, UserRole } from '@openclinic/core';
import type { IAMUnitOfWork } from '../domain/repositories.js';
import { LoginUseCase } from '../application/use-cases/login.use-case.js';
import { RegisterUseCase } from '../application/use-cases/register.use-case.js';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case.js';
import { GetProfileUseCase } from '../application/use-cases/get-profile.use-case.js';
import { LogoutUseCase } from '../application/use-cases/logout.use-case.js';
import { GetMenuUseCase } from '../application/use-cases/get-menu.use-case.js';
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case.js';
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password.use-case.js';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case.js';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js';
import { CreateUserAdminUseCase } from '../application/use-cases/create-user-admin.use-case.js';
import { AdminResetPasswordUseCase } from '../application/use-cases/admin-reset-password.use-case.js';
import { ToggleUserStatusUseCase } from '../application/use-cases/toggle-user-status.use-case.js';
import { UnlockUserUseCase } from '../application/use-cases/unlock-user.use-case.js';
import { UpdateUserAdminUseCase } from '../application/use-cases/update-user-admin.use-case.js';
import { DeleteUserAdminUseCase } from '../application/use-cases/delete-user-admin.use-case.js';
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  RefreshRequestSchema,
  ChangePasswordRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  AdminResetPasswordRequestSchema,
} from './auth.schemas.js';
import { createAuthenticateJwt } from './middlewares/authenticate-jwt.js';
import { requireRole } from './middlewares/require-permission.js';
import { SecurityBearer, StandardErrorResponses } from './openapi.schemas.js';

export function registerAuthRoutes(app: FastifyInstance, uow: IAMUnitOfWork & { resources: any }, jwtConfig: JwtConfig): void {
  const authenticateJwt = createAuthenticateJwt(jwtConfig);

  // ── AUTENTICAÇÃO & SESSÃO ──

  // POST /api/v1/auth/login
  app.post(
    '/api/v1/auth/login',
    {
      schema: {
        tags: ['Autenticação (Auth)'],
        summary: 'Login do Usuário',
        description: 'Autentica um usuário via username ou e-mail com senha protegida por Argon2id. Retorna o access token JWT em memória e define o refresh token em cookie HttpOnly seguro.',
        body: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: { type: 'string', description: 'Username ou e-mail do usuário', example: 'owner.silva' },
            password: { type: 'string', format: 'password', description: 'Senha de acesso', example: 'temp1234' },
          },
        },
        response: {
          200: {
            description: 'Autenticação realizada com sucesso',
            type: 'object',
            properties: {
              access_token: { type: 'string', description: 'Token JWT de acesso com validade curta' },
              token_type: { type: 'string', example: 'Bearer' },
              expires_in: { type: 'integer', description: 'Tempo de expiração em segundos', example: 900 },
              refresh_token: { type: 'string', description: 'Token de renovação' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  username: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  full_name: { type: 'string' },
                  role: { type: 'string', enum: ['OWNER', 'ADMIN', 'USER'] },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const body = LoginRequestSchema.parse(request.body);
      const userAgent = request.headers['user-agent'];
      const useCase = new LoginUseCase(uow, jwtConfig);
      const result = await useCase.execute(body.identifier, body.password, request.ip, userAgent);

      reply.setCookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: (jwtConfig.refreshTokenExpireDays ?? 7) * 86400,
      });

      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/auth/register
  app.post(
    '/api/v1/auth/register',
    {
      schema: {
        tags: ['Autenticação (Auth)'],
        summary: 'Auto-Cadastro de Usuário',
        description: 'Registra um novo usuário no sistema quando o auto-cadastro estiver habilitado.',
        body: {
          type: 'object',
          required: ['email', 'username', 'password', 'full_name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'novo.medico@openclinic.local' },
            username: { type: 'string', minLength: 3, example: 'dr.novo' },
            password: { type: 'string', minLength: 8, format: 'password', example: 'MinhaSenhaForte123' },
            full_name: { type: 'string', example: 'Dr. Novo Silva' },
            display_name: { type: 'string', example: 'Dr. Silva' },
          },
        },
        response: {
          201: {
            description: 'Usuário cadastrado com sucesso',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const body = RegisterRequestSchema.parse(request.body);
      const useCase = new RegisterUseCase(uow);
      const result = await useCase.execute(body, request.ip);
      return reply.status(201).send(result);
    }
  );

  // POST /api/v1/auth/refresh
  app.post(
    '/api/v1/auth/refresh',
    {
      schema: {
        tags: ['Autenticação (Auth)'],
        summary: 'Renovação de Access Token (Refresh)',
        description: 'Gera um novo token de acesso utilizando o refresh token presente no cookie HttpOnly ou no corpo da requisição.',
        body: {
          type: 'object',
          properties: {
            refresh_token: { type: 'string', description: 'Refresh token opcional no body caso não use cookie' },
          },
        },
        response: {
          200: {
            description: 'Token renovado com sucesso',
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              token_type: { type: 'string', example: 'Bearer' },
              expires_in: { type: 'integer' },
              refresh_token: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const cookieToken = (request as any).cookies?.refresh_token;
      const body = request.body ? RefreshRequestSchema.safeParse(request.body) : null;
      const refreshToken = cookieToken ?? (body?.success ? body.data.refresh_token : null);

      if (!refreshToken) {
        return reply.status(401).send({ error: 'Refresh token missing' });
      }

      const useCase = new RefreshTokenUseCase(uow, jwtConfig);
      const result = await useCase.execute(refreshToken);

      reply.setCookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: (jwtConfig.refreshTokenExpireDays ?? 7) * 86400,
      });

      return reply.status(200).send(result);
    }
  );

  // GET /api/v1/auth/profile & GET /api/v1/auth/me
  const getProfileHandler = async (request: any, reply: any) => {
    const useCase = new GetProfileUseCase(uow);
    const profile = await useCase.execute(request.user!.sub);
    return reply.status(200).send(profile);
  };

  const profileSchema = {
    tags: ['Autenticação (Auth)'],
    summary: 'Obter Perfil do Usuário Autenticado',
    description: 'Retorna os dados cadastrais, cargo, papel e grupos do usuário autenticado.',
    security: SecurityBearer,
    response: {
      200: {
        description: 'Perfil do usuário',
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          email: { type: 'string' },
          full_name: { type: 'string' },
          job_title: { type: 'string', nullable: true },
          role: { type: 'string' },
          groups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      },
      ...StandardErrorResponses,
    },
  };

  app.get('/api/v1/auth/profile', { preHandler: [authenticateJwt], schema: profileSchema }, getProfileHandler);
  app.get('/api/v1/auth/me', { preHandler: [authenticateJwt], schema: profileSchema }, getProfileHandler);

  // GET /api/v1/auth/menu
  app.get(
    '/api/v1/auth/menu',
    {
      preHandler: [authenticateJwt],
      schema: {
        tags: ['Autenticação (Auth)'],
        summary: 'Obter Menu de Navegação',
        description: 'Retorna a estrutura de menus dinâmicos com base no papel e permissões ativas.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Estrutura de menu com papel e lista de itens',
            type: 'object',
            properties: {
              role: { type: 'string' },
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
                    description: { type: 'string', nullable: true },
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
      const role = (request.user?.role ?? UserRole.USER) as UserRole;
      const userId = request.user?.sub;
      const useCase = new GetMenuUseCase(uow);
      const menu = await useCase.execute(role, userId);
      return reply.status(200).send(menu);
    }
  );

  // POST /api/v1/auth/change-password
  app.post(
    '/api/v1/auth/change-password',
    {
      preHandler: [authenticateJwt],
      schema: {
        tags: ['Autenticação (Auth)'],
        summary: 'Alteração de Senha do Próprio Usuário',
        description: 'Permite ao usuário autenticado alterar sua própria senha mediante fornecimento da senha atual.',
        security: SecurityBearer,
        body: {
          type: 'object',
          required: ['current_password', 'new_password'],
          properties: {
            current_password: { type: 'string', format: 'password' },
            new_password: { type: 'string', minLength: 8, format: 'password' },
          },
        },
        response: {
          200: {
            description: 'Senha alterada com sucesso',
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const body = ChangePasswordRequestSchema.parse(request.body);
      const useCase = new ChangePasswordUseCase(uow);
      const result = await useCase.execute(request.user!.sub, body.current_password, body.new_password, request.ip);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/auth/forgot-password
  app.post(
    '/api/v1/auth/forgot-password',
    {
      schema: {
        tags: ['Autenticação (Auth)'],
        summary: 'Solicitação de Recuperação de Senha',
        description: 'Dispara o fluxo de recuperação gerando token temporal de redefinição.',
        body: {
          type: 'object',
          required: ['identifier'],
          properties: {
            identifier: { type: 'string', example: 'owner@openclinic.local' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const body = ForgotPasswordRequestSchema.parse(request.body);
      const useCase = new ForgotPasswordUseCase(uow);
      const result = await useCase.execute(body.identifier, request.ip);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/auth/reset-password
  app.post(
    '/api/v1/auth/reset-password',
    {
      schema: {
        tags: ['Autenticação (Auth)'],
        summary: 'Redefinição de Senha via Token',
        description: 'Redefine a senha do usuário utilizando o token de recuperação enviado por e-mail.',
        body: {
          type: 'object',
          required: ['token', 'new_password'],
          properties: {
            token: { type: 'string' },
            new_password: { type: 'string', minLength: 8, format: 'password' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const body = ResetPasswordRequestSchema.parse(request.body);
      const useCase = new ResetPasswordUseCase(uow);
      const result = await useCase.execute(body.token, body.new_password, request.ip);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/auth/logout
  app.post(
    '/api/v1/auth/logout',
    {
      preHandler: [authenticateJwt],
      schema: {
        tags: ['Autenticação (Auth)'],
        summary: 'Encerramento de Sessão (Logout)',
        description: 'Invalida a sessão ativa e limpa o cookie HttpOnly de refresh token.',
        security: SecurityBearer,
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'MSG_LOGOUT_SUCCESS' },
              message: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const cookieToken = (request as any).cookies?.refresh_token;
      if (cookieToken) {
        const useCase = new LogoutUseCase(uow);
        await useCase.execute(request.user!.sub, cookieToken);
      }
      reply.clearCookie('refresh_token', { path: '/api/v1/auth' });
      return reply.status(200).send({
        code: SuccessCode.LOGOUT_SUCCESS,
        message: getSuccessMessage(SuccessCode.LOGOUT_SUCCESS, SupportedLocales.PT_BR),
      });
    }
  );

  // ── GESTÃO DE USUÁRIOS (ADMIN & OWNER) ──

  // GET /api/v1/iam/users
  app.get(
    '/api/v1/iam/users',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Gestão de Usuários (IAM)'],
        summary: 'Listar Todos os Usuários',
        description: 'Retorna a lista completa de usuários cadastrados com seus papéis, status de atividade e bloqueio.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Lista de usuários',
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
      const requesterRole = (request.user as any)?.role as UserRole | undefined;
      const useCase = new ListUsersUseCase(uow);
      const result = await useCase.execute(0, 100, requesterRole);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/iam/users
  app.post(
    '/api/v1/iam/users',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Gestão de Usuários (IAM)'],
        summary: 'Cadastrar Novo Usuário (Admin)',
        description: 'Cria um novo usuário na clínica com papel e senha inicial definidos.',
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
          201: {
            description: 'Usuário criado com sucesso',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              email: { type: 'string' },
              cpf: { type: 'string', nullable: true },
              role: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const body = CreateUserRequestSchema.parse(request.body);
      const creatorRole = request.user!.role as any;
      const useCase = new CreateUserAdminUseCase(uow);
      const result = await useCase.execute(creatorRole, body, request.ip);
      return reply.status(201).send(result);
    }
  );

  // PUT /api/v1/iam/users/:id
  app.put(
    '/api/v1/iam/users/:id',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Gestão de Usuários (IAM)'],
        summary: 'Atualizar Dados do Usuário',
        description: 'Atualiza informações cadastrais e papel RBAC de um usuário existente.',
        security: SecurityBearer,
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'ID do usuário' },
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
          200: {
            description: 'Usuário atualizado com sucesso',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              username: { type: 'string' },
              email: { type: 'string' },
              cpf: { type: 'string', nullable: true },
              role: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = UpdateUserRequestSchema.parse(request.body);
      const creatorRole = request.user!.role as any;
      const useCase = new UpdateUserAdminUseCase(uow);
      const result = await useCase.execute(creatorRole, id, body, request.ip);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/iam/users/:id/reset-password
  app.post(
    '/api/v1/iam/users/:id/reset-password',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Gestão de Usuários (IAM)'],
        summary: 'Redefinição Administrativa de Senha',
        description: 'Permite ao Administrador/Owner definir uma nova senha direta para outro usuário.',
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
          200: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = AdminResetPasswordRequestSchema.parse(request.body);
      const creatorRole = request.user!.role as any;
      const useCase = new AdminResetPasswordUseCase(uow);
      const result = await useCase.execute(creatorRole, id, body.new_password, request.ip);
      return reply.status(200).send(result);
    }
  );

  // PATCH /api/v1/iam/users/:id/status
  app.patch(
    '/api/v1/iam/users/:id/status',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Gestão de Usuários (IAM)'],
        summary: 'Alternar Status Ativo/Inativo do Usuário',
        description: 'Ativa ou desativa o acesso de um usuário ao sistema.',
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
              id: { type: 'string', format: 'uuid' },
              is_active: { type: 'boolean' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const creatorRole = request.user!.role as any;
      const creatorUserId = request.user!.sub;
      const useCase = new ToggleUserStatusUseCase(uow);
      const result = await useCase.execute(creatorRole, id, request.ip, creatorUserId);
      return reply.status(200).send(result);
    }
  );

  // DELETE /api/v1/iam/users/:id
  app.delete(
    '/api/v1/iam/users/:id',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Gestão de Usuários (IAM)'],
        summary: 'Excluir Usuário',
        description: 'Remove um usuário do sistema (com proteção contra auto-exclusão e exclusão de Owners).',
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
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const creatorRole = request.user!.role as any;
      const creatorUserId = request.user!.sub;
      const useCase = new DeleteUserAdminUseCase(uow);
      const result = await useCase.execute(creatorRole, creatorUserId, id, request.ip);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/iam/users/:id/unlock
  app.post(
    '/api/v1/iam/users/:id/unlock',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.ADMIN)],
      schema: {
        tags: ['Gestão de Usuários (IAM)'],
        summary: 'Desbloquear Conta de Usuário',
        description: 'Remove o bloqueio de segurança (lockout) aplicado após tentativas repetidas de falha de login.',
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
              id: { type: 'string', format: 'uuid' },
              is_locked: { type: 'boolean', example: false },
            },
          },
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const creatorRole = request.user!.role as any;
      const useCase = new UnlockUserUseCase(uow);
      const result = await useCase.execute(creatorRole, id, request.ip);
      return reply.status(200).send(result);
    }
  );
}

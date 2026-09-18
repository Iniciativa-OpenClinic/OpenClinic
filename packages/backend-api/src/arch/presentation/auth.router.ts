import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/cookie';
import {
  type JwtConfig,
  SuccessCode,
  getSuccessMessage,
  SupportedLocales,
  UserRole,
  AuthenticationError,
  ErrorCode,
  NodeEnvironment,
  AUTH_SECURITY_DEFAULTS,
} from '@openclinic/core';
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
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  RefreshRequestSchema,
  ChangePasswordRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
} from './auth.schemas.js';
import { createAuthenticateJwt } from './middlewares/authenticate-jwt.js';
import { SecurityBearer, StandardErrorResponses, createActionResponseSchema } from './openapi.schemas.js';

export function registerAuthRoutes(app: FastifyInstance, uow: IAMUnitOfWork, jwtConfig: JwtConfig): void {
  const authenticateJwt = createAuthenticateJwt(jwtConfig, uow);

  // ── AUTHENTICATION & SESSION ──

  // POST /api/v1/auth/login
  app.post(
    '/api/v1/auth/login',
    {
      schema: {
        tags: ['Authentication & Session'],
        summary: 'User Login',
        description: 'Authenticates a user via username or email with Argon2id-protected password. Returns short-lived JWT access token and sets secure HttpOnly refresh token cookie.',
        body: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: { type: 'string', description: 'User username or email', example: 'owner.silva' },
            password: { type: 'string', format: 'password', description: 'Access password', example: 'temp1234' },
          },
        },
        response: {
          200: {
            description: 'Authentication successful',
            type: 'object',
            properties: {
              access_token: { type: 'string', description: 'Short-lived JWT access token' },
              token_type: { type: 'string', example: 'Bearer' },
              expires_in: { type: 'integer', description: 'Expiration time in seconds', example: 900 },
              refresh_token: { type: 'string', description: 'Refresh token' },
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

      reply.setCookie(AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_COOKIE_NAME, result.refresh_token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === NodeEnvironment.PRODUCTION,
        sameSite: 'strict',
        path: AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_COOKIE_PATH,
        maxAge: (jwtConfig.refreshTokenExpireDays ?? AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_EXPIRE_DAYS) * 86400,
      });

      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/auth/register
  app.post(
    '/api/v1/auth/register',
    {
      schema: {
        tags: ['Authentication & Session'],
        summary: 'User Self-Registration',
        description: 'Registers a new user into the system when self-registration is enabled.',
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
            description: 'User registered successfully',
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
        tags: ['Authentication & Session'],
        summary: 'Refresh Access Token',
        description: 'Generates a new access token using the refresh token from HttpOnly cookie or request body.',
        body: {
          type: 'object',
          properties: {
            refresh_token: { type: 'string', description: 'Optional refresh token in body if not using cookie' },
          },
        },
        response: {
          200: {
            description: 'Token renewed successfully',
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
      const cookieToken = request.cookies?.[AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_COOKIE_NAME];
      const body = request.body ? RefreshRequestSchema.safeParse(request.body) : null;
      const refreshToken = cookieToken ?? (body?.success ? body.data.refresh_token : null);

      if (!refreshToken) {
        throw new AuthenticationError(ErrorCode.AUTH_HEADER_MISSING, 'Refresh token is required');
      }

      const useCase = new RefreshTokenUseCase(uow, jwtConfig);
      const userAgent = request.headers['user-agent'];
      const result = await useCase.execute(refreshToken, request.ip, userAgent);

      reply.setCookie(AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_COOKIE_NAME, result.refresh_token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === NodeEnvironment.PRODUCTION,
        sameSite: 'strict',
        path: AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_COOKIE_PATH,
        maxAge: (jwtConfig.refreshTokenExpireDays ?? AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_EXPIRE_DAYS) * 86400,
      });

      return reply.status(200).send(result);
    }
  );

  // GET /api/v1/auth/profile & GET /api/v1/auth/me
  const getProfileHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const useCase = new GetProfileUseCase(uow);
    const profile = await useCase.execute(request.user!.sub);
    return reply.status(200).send(profile);
  };

  const profileSchema = {
    tags: ['Authentication & Session'],
    summary: 'Get Authenticated User Profile',
    description: 'Returns profile data, title, role, and groups of the authenticated user.',
    security: SecurityBearer,
    response: {
      200: {
        description: 'User profile',
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
        tags: ['Authentication & Session'],
        summary: 'Get Navigation Menu',
        description: 'Returns dynamic navigation menu structure based on active role and permissions.',
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
        tags: ['Authentication & Session'],
        summary: 'Change Own Password',
        description: 'Allows the authenticated user to change their own password by providing their current password.',
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
          200: createActionResponseSchema(
            {
              id: { type: 'string', format: 'uuid' },
            },
            'Password successfully changed'
          ),
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
        tags: ['Authentication & Session'],
        summary: 'Forgot Password Request',
        description: 'Triggers password recovery workflow and generates temporary reset token.',
        body: {
          type: 'object',
          required: ['identifier'],
          properties: {
            identifier: { type: 'string', example: 'owner@openclinic.local' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              expires_in_minutes: { type: 'integer' },
            },
            'Forgot password request processed'
          ),
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
        tags: ['Authentication & Session'],
        summary: 'Reset Password via Token',
        description: 'Resets user password using the recovery token.',
        body: {
          type: 'object',
          required: ['token', 'new_password'],
          properties: {
            token: { type: 'string' },
            new_password: { type: 'string', minLength: 8, format: 'password' },
          },
        },
        response: {
          200: createActionResponseSchema(
            {
              id: { type: 'string', format: 'uuid' },
            },
            'Password reset successfully'
          ),
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
        tags: ['Authentication & Session'],
        summary: 'User Logout',
        description: 'Terminates active session and clears the HttpOnly refresh token cookie.',
        security: SecurityBearer,
        response: {
          200: createActionResponseSchema(undefined, 'User logged out successfully'),
          ...StandardErrorResponses,
        },
      },
    },
    async (request, reply) => {
      const cookieToken = request.cookies?.[AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_COOKIE_NAME];
      const body = request.body ? RefreshRequestSchema.safeParse(request.body) : null;
      const refreshToken = cookieToken ?? (body?.success ? body.data.refresh_token : undefined);

      const useCase = new LogoutUseCase(uow);
      await useCase.execute(request.user!.sub, refreshToken);

      reply.clearCookie(AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_COOKIE_NAME, {
        path: AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_COOKIE_PATH,
      });
      return reply.status(200).send({
        code: SuccessCode.LOGOUT_SUCCESS,
        message: getSuccessMessage(SuccessCode.LOGOUT_SUCCESS, SupportedLocales.PT_BR),
      });
    }
  );
}

import type { FastifyRequest, FastifyReply } from 'fastify';
import { decodeToken, AuthenticationError, ErrorCode } from '@openclinic/core';
import type { TokenPayload, JwtConfig } from '@openclinic/core';
import type { IAMUnitOfWork } from '../../domain/repositories.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export function createAuthenticateJwt(jwtConfig: JwtConfig, uow?: IAMUnitOfWork) {
  return async function authenticateJwt(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError(ErrorCode.AUTH_HEADER_MISSING);
    }

    const token = authHeader.slice(7);
    let payload: TokenPayload;
    try {
      payload = decodeToken(token, jwtConfig);
    } catch {
      throw new AuthenticationError(ErrorCode.TOKEN_EXPIRED);
    }

    if (!payload.sid) {
      throw new AuthenticationError(ErrorCode.TOKEN_INVALID);
    }

    if (uow) {
      const session = await uow.sessions.findById(payload.sid);
      if (!session || session.revoked_at !== null || session.expires_at < new Date() || session.user_id !== payload.sub) {
        throw new AuthenticationError(ErrorCode.TOKEN_INVALID);
      }

      const user = await uow.users.getById(payload.sub);
      if (!user || !user.is_active) {
        throw new AuthenticationError(ErrorCode.USER_DISABLED);
      }

      if (user.role && user.role !== payload.role) {
        payload = { ...payload, role: user.role };
      }

      if (user.tenant_id && user.tenant_id !== payload.tenant_id) {
        payload = { ...payload, tenant_id: user.tenant_id };
      }
    }

    request.user = payload;
  };
}

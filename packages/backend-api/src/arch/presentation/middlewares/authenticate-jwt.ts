import type { FastifyRequest, FastifyReply } from 'fastify';
import { decodeToken, AuthenticationError, ErrorCode } from '@openclinic/core';
import type { TokenPayload, JwtConfig } from '@openclinic/core';

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export function createAuthenticateJwt(jwtConfig: JwtConfig) {
  return async function authenticateJwt(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError(ErrorCode.AUTH_HEADER_MISSING);
    }

    const token = authHeader.slice(7);
    try {
      request.user = decodeToken(token, jwtConfig);
    } catch {
      throw new AuthenticationError(ErrorCode.TOKEN_EXPIRED);
    }
  };
}

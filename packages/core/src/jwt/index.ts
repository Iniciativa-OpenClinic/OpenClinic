import jwt from 'jsonwebtoken';
import { AUTH_SECURITY_DEFAULTS } from '../constants/auth.constants.js';
import { TIME_CONSTANTS } from '../constants/system.constants.js';

export interface TokenPayload {
  sub: string;
  role: string;
  email: string;
  tenant_id?: string;
  sid?: string;
  iat?: number;
  exp?: number;
}

export interface JwtConfig {
  secretKey: string;
  algorithm?: jwt.Algorithm;
  accessTokenExpireMinutes?: number;
  refreshTokenExpireDays?: number;
}

export function createAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, config: JwtConfig): string {
  const expireMinutes = config.accessTokenExpireMinutes ?? AUTH_SECURITY_DEFAULTS.ACCESS_TOKEN_EXPIRE_MINUTES;
  return jwt.sign(payload, config.secretKey, {
    algorithm: config.algorithm ?? AUTH_SECURITY_DEFAULTS.JWT_ALGORITHM,
    expiresIn: expireMinutes * TIME_CONSTANTS.SECONDS_PER_MINUTE,
  });
}

export function createRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, config: JwtConfig): string {
  const expireDays = config.refreshTokenExpireDays ?? AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_EXPIRE_DAYS;
  return jwt.sign(payload, config.secretKey, {
    algorithm: config.algorithm ?? AUTH_SECURITY_DEFAULTS.JWT_ALGORITHM,
    expiresIn: expireDays * TIME_CONSTANTS.SECONDS_PER_DAY,
  });
}

export function decodeToken(token: string, config: JwtConfig): TokenPayload {
  const decoded = jwt.verify(token, config.secretKey, {
    algorithms: [config.algorithm ?? AUTH_SECURITY_DEFAULTS.JWT_ALGORITHM],
  });
  return decoded as TokenPayload;
}

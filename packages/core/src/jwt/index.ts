import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string;
  role: string;
  email: string;
  tenant_id?: string;
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
  const expireMinutes = config.accessTokenExpireMinutes ?? 15;
  return jwt.sign(payload, config.secretKey, {
    algorithm: config.algorithm ?? 'HS256',
    expiresIn: expireMinutes * 60,
  });
}

export function createRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, config: JwtConfig): string {
  const expireDays = config.refreshTokenExpireDays ?? 7;
  return jwt.sign(payload, config.secretKey, {
    algorithm: config.algorithm ?? 'HS256',
    expiresIn: expireDays * 24 * 60 * 60,
  });
}

export function decodeToken(token: string, config: JwtConfig): TokenPayload {
  const decoded = jwt.verify(token, config.secretKey, {
    algorithms: [config.algorithm ?? 'HS256'],
  });
  return decoded as TokenPayload;
}

import { z } from 'zod';
import { AUTH_SECURITY_DEFAULTS, NodeEnvironment, SYSTEM_DEFAULTS, LogLevel, SecretsProvider, resolveDatabaseUrl } from '@openclinic/core';
import { loadEnvironment } from '@openclinic/core/server';

loadEnvironment();

const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .startsWith(SYSTEM_DEFAULTS.DATABASE_PROTOCOL_PREFIX)
    .default(() => resolveDatabaseUrl(process.env) ?? ''),
  JWT_KEY: z.string().min(AUTH_SECURITY_DEFAULTS.JWT_MIN_KEY_LENGTH),
  JWT_ALGORITHM: z.enum(AUTH_SECURITY_DEFAULTS.SUPPORTED_JWT_ALGORITHMS).default(AUTH_SECURITY_DEFAULTS.JWT_ALGORITHM),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().int().positive().default(AUTH_SECURITY_DEFAULTS.ACCESS_TOKEN_EXPIRE_MINUTES),
  REFRESH_TOKEN_EXPIRE_DAYS: z.coerce.number().int().positive().default(AUTH_SECURITY_DEFAULTS.REFRESH_TOKEN_EXPIRE_DAYS),
  APP_HOST: z.string().default(SYSTEM_DEFAULTS.DEFAULT_APP_HOST),
  APP_PORT: z.coerce.number().int().positive().default(SYSTEM_DEFAULTS.DEFAULT_APP_PORT),
  CORS_ALLOWED_ORIGINS: z.string().default(SYSTEM_DEFAULTS.DEFAULT_CORS_ALLOWED_ORIGINS),
  NODE_ENV: z.nativeEnum(NodeEnvironment).default(NodeEnvironment.DEVELOPMENT),
  LOG_LEVEL: z.nativeEnum(LogLevel).default(SYSTEM_DEFAULTS.DEFAULT_LOG_LEVEL),
  SECRETS_PROVIDER: z.nativeEnum(SecretsProvider).default(SecretsProvider.FILE),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

function loadEnv(): EnvConfig {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();

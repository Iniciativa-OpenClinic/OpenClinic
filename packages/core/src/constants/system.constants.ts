import { LogLevel } from '../domain/enums.js';

/**
 * Canonical system, network, database connection, and query defaults.
 */
export const SYSTEM_DEFAULTS = {
  DEFAULT_APP_HOST: '0.0.0.0',
  DEFAULT_APP_PORT: 3000,
  DEFAULT_DB_HOST: 'localhost',
  DEFAULT_DB_PORT: 5432,
  DATABASE_PROTOCOL_PREFIX: 'postgresql://',
  DEFAULT_CORS_ALLOWED_ORIGINS: 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000',
  DEFAULT_LOG_LEVEL: LogLevel.INFO,
  DEFAULT_PAGE_SKIP: 0,
  DEFAULT_PAGE_LIMIT: 100,
} as const;

export type SystemDefaults = typeof SYSTEM_DEFAULTS;

/**
 * Canonical time measurement constants.
 */
export const TIME_CONSTANTS = {
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  SECONDS_PER_DAY: 86400,
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 60000,
  MS_PER_DAY: 86400000,
} as const;

export type TimeConstants = typeof TIME_CONSTANTS;


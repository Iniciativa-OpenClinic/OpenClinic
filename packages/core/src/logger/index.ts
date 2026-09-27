import pino from 'pino';
import { LogLevel, type LogLevelType } from '../domain/enums.js';
import { SYSTEM_DEFAULTS } from '../constants/system.constants.js';

export { LogLevel, type LogLevelType };

export interface LoggerConfig {
  level?: LogLevel;
  name?: string;
}

export function createLogger(config: LoggerConfig = {}): pino.Logger {
  return pino({
    name: config.name ?? 'openclinic',
    level: config.level ?? SYSTEM_DEFAULTS.DEFAULT_LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  });
}

export const logger = createLogger({
  level: (process.env['LOG_LEVEL'] as LogLevel) ?? SYSTEM_DEFAULTS.DEFAULT_LOG_LEVEL,
});

export type { Logger } from 'pino';

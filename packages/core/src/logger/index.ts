import pino from 'pino';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerConfig {
  level?: LogLevel;
  name?: string;
}

export function createLogger(config: LoggerConfig = {}): pino.Logger {
  return pino({
    name: config.name ?? 'openclinic',
    level: config.level ?? 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  });
}

export const logger = createLogger({
  level: (process.env['LOG_LEVEL'] as LogLevel) ?? 'info',
});

export type { Logger } from 'pino';

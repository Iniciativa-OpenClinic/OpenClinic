import { createLogger } from '@openclinic/core';
import { env } from './config/env.js';
import { buildApp } from './app.js';

const logger = createLogger({ level: env.LOG_LEVEL, name: 'openclinic-api' });

async function bootstrap(): Promise<void> {
  const app = await buildApp();

  await app.listen({ host: env.APP_HOST, port: env.APP_PORT });
  logger.info(`🏥 OpenClinic API running at http://${env.APP_HOST}:${env.APP_PORT}`);
  logger.info(`📚 Swagger Interactive Docs available at http://${env.APP_HOST}:${env.APP_PORT}/docs`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});

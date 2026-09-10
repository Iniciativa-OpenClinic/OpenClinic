import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/arch/infrastructure/database/drizzle-schema.ts',
  out: '../../infra/database/migrations',
  dialect: 'postgresql',
  // Generation is offline. Database writes use the guarded backend CLI only.
});

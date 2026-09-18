import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  parseDatabaseSecret,
  parseJwtSecret,
  secretsMode,
  loadSecretFiles,
  loadEnvironment,
  SECRETS_PROVIDER,
  SECRET_NAMES,
  type SecretEnvironment,
} from '../src/server/index.js';

describe('@openclinic/core/server', () => {
  describe('parseDatabaseSecret', () => {
    it('parses JSON database secret with individual parameters', () => {
      const raw = JSON.stringify({
        host: 'db.internal',
        port: 5433,
        database: 'my_app_db',
        user: 'app_user',
        password: 'secret@password',
      });
      const url = parseDatabaseSecret(raw, 'test-db');
      expect(url).toBe('postgresql://app_user:secret%40password@db.internal:5433/my_app_db');
    });

    it('parses raw postgresql connection string', () => {
      const raw = 'postgresql://user:pass@localhost:5432/clinic';
      expect(parseDatabaseSecret(raw)).toBe('postgresql://user:pass@localhost:5432/clinic');
    });

    it('throws descriptive error on invalid format', () => {
      expect(() => parseDatabaseSecret('invalid')).toThrow(/must be formatted as JSON or a postgresql:\/\//);
      expect(() => parseDatabaseSecret('{ invalid json')).toThrow(/contains invalid JSON/);
    });
  });

  describe('parseJwtSecret', () => {
    it('parses JSON JWT secret with secretKey', () => {
      const raw = JSON.stringify({ secretKey: '0123456789abcdef0123456789abcdef' });
      expect(parseJwtSecret(raw)).toBe('0123456789abcdef0123456789abcdef');
    });

    it('parses raw string JWT secret of valid length', () => {
      const raw = '0123456789abcdef0123456789abcdef\n';
      expect(parseJwtSecret(raw)).toBe('0123456789abcdef0123456789abcdef');
    });

    it('rejects secrets shorter than 16 characters', () => {
      expect(() => parseJwtSecret('short')).toThrow(/at least 16 characters/);
    });
  });

  describe('secretsMode', () => {
    it('returns env by default when no provider specified', () => {
      expect(secretsMode({})).toBe('env');
    });

    it('normalizes SECRETS_PROVIDER', () => {
      expect(secretsMode({ SECRETS_PROVIDER: 'FILE' })).toBe('file');
      expect(secretsMode({ SECRETS_PROVIDER: 'env' })).toBe('env');
    });

    it('rejects obsolete provider selectors', () => {
      expect(() => secretsMode({ SECRETS_MODE: 'files' })).toThrow(/Use SECRETS_PROVIDER/);
    });

    it('throws on invalid provider', () => {
      expect(() => secretsMode({ SECRETS_PROVIDER: 'unknown' })).toThrow(/SECRETS_PROVIDER must be/);
    });
  });

  describe('loadSecretFiles', () => {
    it('preserves existing env and synthesizes DATABASE_URL when SECRETS_PROVIDER is env', () => {
      const env: SecretEnvironment = {
        JWT_KEY: 'test-key-value',
        SECRETS_PROVIDER: 'env',
        DB_HOST: '127.0.0.1',
        DB_PORT: '5432',
        DB_NAME: 'openclinic_test',
        DB_USER: 'app_user',
        DB_PASS: 'app_pass',
      };
      loadSecretFiles(env);
      expect(env.JWT_KEY).toBe('test-key-value');
      expect(env['DATABASE_URL']).toBe('postgresql://app_user:app_pass@127.0.0.1:5432/openclinic_test');
    });

    it('resolves database and jwt secrets via custom secret names in file mode', () => {
      const directory = mkdtempSync(join(tmpdir(), 'secrets-test-'));
      const dbSecretFile = join(directory, 'database-secret-app.credentials.json');
      const jwtSecretFile = join(directory, 'jwt-secret.credentials.json');
      writeFileSync(dbSecretFile, JSON.stringify({ host: 'db', database: 'prod_db', user: 'u', password: 'p' }));
      writeFileSync(jwtSecretFile, JSON.stringify({ secretKey: '0123456789abcdef0123456789abcdef' }));
      try {
        const env: SecretEnvironment = {
          SECRETS_PROVIDER: 'file',
          SECRETS_DIR: directory,
          DB_APP_SECRET_NAME: 'database-secret-app',
          JWT_SECRET_NAME: 'jwt-secret',
        };
        loadSecretFiles(env);
        expect(env['DATABASE_URL']).toBe('postgresql://u:p@db:5432/prod_db');
        expect(env['JWT_KEY']).toBe('0123456789abcdef0123456789abcdef');
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });

    it('exports all SECRET_NAMES as expected', () => {
      expect(SECRET_NAMES).toContain('DATABASE_URL');
      expect(SECRET_NAMES).toContain('JWT_KEY');
      expect(SECRET_NAMES).toContain('DATABASE_OWNER_URL');
    });
  });

  describe('loadEnvironment', () => {
    it('loads a supplied environment without mutating process.env', () => {
      const directory = mkdtempSync(join(tmpdir(), 'template-env-'));
      const file = join(directory, '.env');
      const key = 'TEMPLATE_ENV_ISOLATION_TEST';
      const previous = process.env[key];
      try {
        writeFileSync(file, key + '=synthetic\nSECRETS_PROVIDER=env\n');
        const environment: Record<string, string | undefined> = {};
        const result = loadEnvironment({ environment, customEnvPath: file });
        expect(result[key]).toBe('synthetic');
        expect(process.env[key]).toBe(previous);
      } finally { rmSync(directory, { recursive: true, force: true }); }
    });
  });
});

import { readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseDatabaseSecret, parseJwtSecret } from './parsers.js';

import { resolveDatabaseUrl } from '../database/index.js';
import { SecretsProvider, type SecretsProvider as SecretsProviderValue } from '../domain/enums.js';

export const SECRET_NAMES = Object.freeze([
  'DATABASE_URL',
  'DATABASE_OWNER_URL',
  'REMOTE_DATABASE_OWNER_URL',
  'DATABASE_REMOTE_URL',
  'DB_PASS',
  'JWT_KEY',
  'DEFAULT_ADMIN_PASSWORD',
  'DEMO_USER_PASSWORD',
  'PG_SUPERUSER_URL',
  'DATABASE_SUPERUSER_URL',
] as const);

export type SecretName = (typeof SECRET_NAMES)[number];

export const SECRETS_PROVIDER = SecretsProvider;
export type { SecretsProviderValue };

export const SUPPORTED_SECRETS_PROVIDERS: readonly SecretsProviderValue[] = Object.freeze(
  Object.values(SecretsProvider)
);

export type SecretEnvironment = Record<string, string | undefined>;


export interface SecretProvider {
  name: string;
  getSecret(logicalName: string, environment?: SecretEnvironment): string;
}

/**
 * Normalizes and checks the secrets mode / provider.
 * Uses SECRETS_PROVIDER as the single provider selector.
 */
export function secretsMode(environment: SecretEnvironment = process.env): SecretsProviderValue {
  const provider = environment['SECRETS_PROVIDER'];
  if (environment['SECRETS_MODE'] !== undefined) throw new Error('Use SECRETS_PROVIDER; SECRETS_MODE is not supported.');

  if (provider !== undefined) {
    const norm = provider.toLowerCase().trim() as SecretsProviderValue;
    if (SUPPORTED_SECRETS_PROVIDERS.includes(norm)) {
      return norm;
    }
    throw new Error(`SECRETS_PROVIDER must be ${SUPPORTED_SECRETS_PROVIDERS.join(', ')}.`);
  }

  return SECRETS_PROVIDER.ENV;
}

export class FileSecretProvider implements SecretProvider {
  public readonly name = 'file';
  private readonly secretsDir?: string;

  constructor(options: { secretsDir?: string } = {}) {
    this.secretsDir = options.secretsDir;
  }

  getSearchDirectories(environment: SecretEnvironment = process.env): string[] {
    const customDir = environment['SECRETS_DIR'] || this.secretsDir;
    const dirs: string[] = [];

    if (customDir) {
      dirs.push(path.resolve(process.cwd(), customDir));
    }

    dirs.push(
      '/run/secrets',
      path.resolve(process.cwd(), 'secrets'),
      path.resolve(process.cwd(), '../secrets'),
      path.resolve(process.cwd(), '../../secrets'),
      path.resolve(process.cwd(), '../../../secrets')
    );

    return [...new Set(dirs)];
  }

  resolveSecretPath(logicalName: string, environment: SecretEnvironment = process.env): string {
    if (!logicalName || typeof logicalName !== 'string') {
      throw new Error(`Invalid secret identifier: "${logicalName}".`);
    }

    if (path.isAbsolute(logicalName) && existsSync(logicalName)) {
      return logicalName;
    }

    const directCwd = path.resolve(process.cwd(), logicalName);
    if (existsSync(directCwd) && statSync(directCwd).isFile()) {
      return directCwd;
    }

    const directories = this.getSearchDirectories(environment);
    const candidateFilenames = [
      logicalName,
      `${logicalName}.credentials.json`,
      `${logicalName}.json`,
      `${logicalName}.credentials`,
      `${logicalName}.key`,
      `${logicalName}.secret`,
    ];

    if (logicalName === 'database-secret-app' || logicalName === 'database-app') {
      candidateFilenames.push(
        'database-secret-app.credentials.json',
        'database-secret-app.json',
        'database-secret-app',
        'database-app.credentials.json',
        'database-app.json',
        'database-app'
      );
    } else if (logicalName === 'database-secret-owner' || logicalName === 'database-owner') {
      candidateFilenames.push(
        'database-secret-owner.credentials.json',
        'database-secret-owner.json',
        'database-secret-owner',
        'database-owner.credentials.json',
        'database-owner.json',
        'database-owner'
      );
    } else if (logicalName === 'jwt-secret' || logicalName === 'jwt_secret') {
      candidateFilenames.push(
        'jwt-secret.credentials.json',
        'jwt-secret.json',
        'jwt.credentials.json',
        'jwt.json',
        'jwt.key',
        'jwt.secret'
      );
    } else if (logicalName === 'jwt') {
      candidateFilenames.push('jwt-secret.credentials.json', 'jwt-secret.json', 'jwt_secret.credentials.json');
    }

    for (const dir of directories) {
      for (const filename of candidateFilenames) {
        const fullPath = path.resolve(dir, filename);
        if (existsSync(fullPath)) {
          try {
            const stat = statSync(fullPath);
            if (stat.isFile()) {
              return fullPath;
            }
          } catch {
            // Continue searching if stat fails
          }
        }
      }
    }

    throw new Error(
      `Secret file for "${logicalName}" not found. Searched candidate directories: ${directories.join(', ')}.`
    );
  }

  getSecret(logicalName: string, environment: SecretEnvironment = process.env): string {
    const filePath = this.resolveSecretPath(logicalName, environment);

    try {
      const stat = statSync(filePath);
      if (!stat.isFile() || stat.size > 512000) {
        throw new Error(`Secret file "${filePath}" exceeds maximum size (500 KiB) or is not a regular file.`);
      }
      const content = readFileSync(filePath, 'utf8');
      if (!content.trim() || content.includes('\0')) {
        throw new Error(`Secret file "${filePath}" contains empty or invalid content.`);
      }
      return content;
    } catch (error) {
      if (error instanceof Error && error.message.includes('exceeds maximum size')) {
        throw error;
      }
      throw new Error(`Cannot read secret "${logicalName}" from "${filePath}".`);
    }
  }
}

export class EnvProvider implements SecretProvider {
  public readonly name = 'env';

  getSecret(secretName: string): string {
    throw new Error(
      `Cannot resolve secret "${secretName}" when SECRETS_PROVIDER=env. ` +
        'Configure direct atomic environment variables (DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME, JWT_KEY) or set SECRETS_PROVIDER=file.'
    );
  }
}

export class GsmSecretProvider implements SecretProvider {
  public readonly name = 'gsm';

  getSecret(secretName: string): string {
    throw new Error(`Google Secret Manager provider not configured for "${secretName}".`);
  }
}

export class AwsSecretProvider implements SecretProvider {
  public readonly name = 'aws';

  getSecret(secretName: string): string {
    throw new Error(`AWS Secrets Manager provider not configured for "${secretName}".`);
  }
}

/**
 * Creates the appropriate SecretProvider instance based on configuration.
 */
export function createSecretProvider(environment: SecretEnvironment = process.env): SecretProvider {
  const rawProvider = secretsMode(environment);

  switch (rawProvider) {
    case SECRETS_PROVIDER.ENV:
      return new EnvProvider();
    case SECRETS_PROVIDER.FILE:
      return new FileSecretProvider();
    case SECRETS_PROVIDER.GSM:
      return new GsmSecretProvider();
    case SECRETS_PROVIDER.AWS:
      return new AwsSecretProvider();
    default:
      throw new Error(`Invalid SECRETS_PROVIDER "${rawProvider}". Allowed values are: ${SUPPORTED_SECRETS_PROVIDERS.join(', ')}.`);
  }
}

/**
 * Resolves configured secrets (via provider or direct files), once at bootstrap.
 * Updates the environment atomically. Never includes sensitive values in errors.
 */
export function loadSecretFiles(environment: SecretEnvironment = process.env): void {
  secretsMode(environment);
  const resolved: Record<string, string> = {};
  const fileProvider = createSecretProvider(environment);

  // 1. Resolve structured logical secrets (DB_APP_SECRET_NAME, DB_OWNER_SECRET_NAME, JWT_SECRET_NAME)
  if (fileProvider.name !== 'env') {
    const appSecretName = environment['DB_APP_SECRET_NAME'] || environment['DB_APP_SECRET'] || 'database-secret-app';
    if (appSecretName) {
      try {
        const raw = fileProvider.getSecret(appSecretName, environment);
        resolved['DATABASE_URL'] = parseDatabaseSecret(raw, appSecretName);
      } catch (error) {
        if (environment['DB_APP_SECRET_NAME'] || environment['DB_APP_SECRET']) {
          throw error;
        }
      }
    }

    const ownerSecretName = environment['DB_OWNER_SECRET_NAME'] || environment['DB_OWNER_SECRET'];
    if (ownerSecretName) {
      try {
        const raw = fileProvider.getSecret(ownerSecretName, environment);
        resolved['DATABASE_OWNER_URL'] = parseDatabaseSecret(raw, ownerSecretName);
      } catch (error) {
        if (environment['DB_OWNER_SECRET_NAME'] || environment['DB_OWNER_SECRET']) {
          throw error;
        }
      }
    }

    const jwtSecretName = environment['JWT_SECRET_NAME'] || environment['JWT_SECRET'] || 'jwt-secret';
    if (jwtSecretName) {
      try {
        const raw = fileProvider.getSecret(jwtSecretName, environment);
        resolved['JWT_KEY'] = parseJwtSecret(raw, jwtSecretName);
      } catch (error) {
        if (environment['JWT_SECRET_NAME'] || environment['JWT_SECRET']) {
          throw error;
        }
      }
    }
  } else {
    // In SECRETS_PROVIDER=env: DATABASE_URL is never stored in .env; synthesize dynamically from atomic variables
    if (!environment['DATABASE_URL']) {
      const synthesizedUrl = resolveDatabaseUrl(environment);
      if (synthesizedUrl) {
        resolved['DATABASE_URL'] = synthesizedUrl;
      }
    }

    // Security advisory when running with SECRETS_PROVIDER=env in production
    if (environment['NODE_ENV'] === 'production') {
      console.warn(
        '⚠️ [SECURITY ADVISORY] SECRETS_PROVIDER=env is active in production. Plaintext credentials in environment variables may increase exposure risks. Consider using file (Docker Secrets), gsm, or aws in production.'
      );
    }
  }

  // 2. Resolve direct ${NAME}_FILE mounts
  for (const name of SECRET_NAMES) {
    const fileKey = `${name}_FILE`;
    const filePath = environment[fileKey];

    if (secretsMode(environment) === SECRETS_PROVIDER.FILE && environment[name] !== undefined) {
      throw new Error(`${name} must be supplied through ${fileKey} in files mode.`);
    }

    if (filePath === undefined) continue;
    if (!filePath.trim()) throw new Error(`${fileKey} must specify a file.`);

    let value: string;
    try {
      const stat = statSync(filePath);
      if (!stat.isFile() || stat.size > 512000) throw new Error();
      value = readFileSync(filePath, 'utf8');
    } catch {
      throw new Error(`Cannot read ${fileKey}; expected a readable secret file up to 500 KiB.`);
    }

    value = value.replace(/\r?\n$/, '');
    if (!value.trim() || value.includes('\0')) {
      throw new Error(`${fileKey} contains an empty or invalid secret.`);
    }
    resolved[name] = value;
  }

  // Atomic update: only apply if all reads succeeded
  Object.assign(environment, resolved);
}

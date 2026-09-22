import { readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseDatabaseSecret, parseJwtSecret } from './parsers.js';

import {
  SecretsProvider,
  type SecretsProvider as SecretsProviderValue,
} from '../domain/enums.js';

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
    if ((norm as string) === 'env') {
      throw new Error(
        'SECRETS_PROVIDER="env" is no longer supported. OpenClinic enforces a Secrets-First architecture. Use "file", "gsm", or "aws".'
      );
    }
    if (SUPPORTED_SECRETS_PROVIDERS.includes(norm)) {
      return norm;
    }
    throw new Error(`SECRETS_PROVIDER must be ${SUPPORTED_SECRETS_PROVIDERS.join(', ')}.`);
  }

  return SECRETS_PROVIDER.FILE;
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

    const candidateFiles = [
      logicalName,
      `${logicalName}.json`,
      `${logicalName}.txt`,
    ];

    for (const dir of this.getSearchDirectories(environment)) {
      for (const file of candidateFiles) {
        const fullPath = path.resolve(dir, file);
        if (existsSync(fullPath)) {
          return fullPath;
        }
      }
    }

    const searchLocations = this.getSearchDirectories(environment).join(', ');
    throw new Error(`Secret "${logicalName}" not found in search locations: ${searchLocations}.`);
  }

  getSecret(logicalName: string, environment: SecretEnvironment = process.env): string {
    const filePath = this.resolveSecretPath(logicalName, environment);
    try {
      const stat = statSync(filePath);
      if (!stat.isFile()) {
        throw new Error(`Secret path "${filePath}" is not a regular file.`);
      }
      if (stat.size > 512000) {
        throw new Error(`Secret file "${filePath}" exceeds maximum size limit of 500 KiB.`);
      }
      const content = readFileSync(filePath, 'utf8').replace(/\r?\n$/, '');
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
  const provider = createSecretProvider(environment);

  // 1. Resolve structured logical secrets (DB_APP_SECRET_NAME, DB_OWNER_SECRET_NAME, JWT_SECRET_NAME)
  const appSecretName = environment['DB_APP_SECRET_NAME'] || 'database-secret-app';
  try {
    const rawAppSecret = provider.getSecret(appSecretName, environment);
    resolved['DATABASE_URL'] = parseDatabaseSecret(rawAppSecret, appSecretName, environment);
  } catch (err) {
    if (environment['DB_APP_SECRET_NAME']) throw err;
  }

  const ownerSecretName = environment['DB_OWNER_SECRET_NAME'];
  if (ownerSecretName) {
    const rawOwnerSecret = provider.getSecret(ownerSecretName, environment);
    resolved['DATABASE_OWNER_URL'] = parseDatabaseSecret(rawOwnerSecret, ownerSecretName, environment);
  }

  const jwtSecretName = environment['JWT_SECRET_NAME'] || 'jwt-secret';
  try {
    const rawJwtSecret = provider.getSecret(jwtSecretName, environment);
    resolved['JWT_KEY'] = parseJwtSecret(rawJwtSecret, jwtSecretName);
  } catch (err) {
    if (environment['JWT_SECRET_NAME']) throw err;
  }

  // 2. Resolve direct ${NAME}_FILE mounts and enforce Secrets-First
  for (const name of SECRET_NAMES) {
    const fileKey = `${name}_FILE`;
    const filePath = environment[fileKey];

    if (environment[name] !== undefined) {
      throw new Error(`${name} must not be supplied in environment variables. In Secrets-First architecture, credentials must be supplied via secrets (${fileKey} or secret provider).`);
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

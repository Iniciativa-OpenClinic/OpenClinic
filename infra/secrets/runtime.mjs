import { readFileSync, statSync } from 'node:fs';
import { createSecretProvider } from './secret-factory.mjs';
import { parseDatabaseSecret } from './parsers/database-parser.mjs';
import { parseJwtSecret } from './parsers/jwt-parser.mjs';

export const SECRET_NAMES = Object.freeze([
  'DATABASE_URL', 'DATABASE_OWNER_URL', 'REMOTE_DATABASE_OWNER_URL',
  'DATABASE_REMOTE_URL', 'DB_PASS', 'JWT_KEY',
  'DEFAULT_ADMIN_PASSWORD', 'DEMO_USER_PASSWORD',
  'PG_SUPERUSER_URL', 'DATABASE_SUPERUSER_URL',
]);

export const SECRETS_PROVIDER = Object.freeze({
  ENV: 'env',
  FILE: 'file',
  GSM: 'gsm',
  AWS: 'aws',
});

export const SUPPORTED_SECRETS_PROVIDERS = Object.freeze(Object.values(SECRETS_PROVIDER));


/**
 * Normalizes and checks the secrets mode / provider.
 * Uses SECRETS_PROVIDER as the single provider selector.
 *
 * @param {Record<string, string | undefined>} environment
 * @returns {'env' | 'file' | 'gsm' | 'aws'}
 */
export function secretsMode(environment = process.env) {
  const provider = environment.SECRETS_PROVIDER;
  if (environment['SECRETS_MODE'] !== undefined) throw new Error('Use SECRETS_PROVIDER; SECRETS_MODE is not supported.');

  if (provider !== undefined) {
    const norm = provider.toLowerCase().trim();
    if (SUPPORTED_SECRETS_PROVIDERS.includes(norm)) {
      return norm;
    }
    throw new Error(`SECRETS_PROVIDER must be ${SUPPORTED_SECRETS_PROVIDERS.join(', ')}.`);
  }

  return SECRETS_PROVIDER.ENV;
}

/**
 * Resolves configured secrets (via provider or direct files), once at bootstrap.
 * Updates the environment atomically. Never includes sensitive values in errors.
 *
 * @param {Record<string, string | undefined>} environment
 */
export function loadSecretFiles(environment = process.env) {
  const mode = secretsMode(environment);
  const resolved = {};
  const fileProvider = createSecretProvider(environment);

  // 1. Resolve structured logical secrets (DB_APP_SECRET_NAME, DB_OWNER_SECRET_NAME, JWT_SECRET_NAME)
  // When a secret provider is active (file, gsm, aws), resolve credentials from the provider.
  if (fileProvider.name !== 'env') {
    const appSecretName = environment.DB_APP_SECRET_NAME || 'database-secret-app';
    try {
      const rawApp = fileProvider.getSecret(appSecretName, environment);
      resolved['DATABASE_URL'] = parseDatabaseSecret(rawApp, appSecretName);
    } catch (err) {
      if (environment.DB_APP_SECRET_NAME) throw err;
    }

    const ownerSecretName = environment.DB_OWNER_SECRET_NAME;
    if (ownerSecretName) {
      const rawOwner = fileProvider.getSecret(ownerSecretName, environment);
      resolved['DATABASE_OWNER_URL'] = parseDatabaseSecret(rawOwner, ownerSecretName);
    }

    const jwtSecretName = environment.JWT_SECRET_NAME || 'jwt-secret';
    try {
      const rawJwt = fileProvider.getSecret(jwtSecretName, environment);
      resolved['JWT_KEY'] = parseJwtSecret(rawJwt, jwtSecretName);
    } catch (err) {
      if (environment.JWT_SECRET_NAME) throw err;
    }
  } else {
    // Security advisory when running with SECRETS_PROVIDER=env in production
    if (environment.NODE_ENV === 'production') {
      console.warn(
        '⚠️ [SECURITY ADVISORY] SECRETS_PROVIDER=env is active in production. Plaintext credentials in environment variables may increase exposure risks. Consider using file (Docker Secrets), gsm, or aws in production.'
      );
    }
  }

  // 2. Resolve direct ${NAME}_FILE mounts
  for (const name of SECRET_NAMES) {
    const fileKey = `${name}_FILE`;
    const filePath = environment[fileKey];

    if (mode === SECRETS_PROVIDER.FILE && environment[name] !== undefined) {
      throw new Error(`${name} must be supplied through ${fileKey} in files mode.`);
    }

    if (filePath === undefined) continue;
    if (!filePath.trim()) throw new Error(`${fileKey} must specify a file.`);

    let value;
    try {
      const stat = statSync(filePath);
      if (!stat.isFile() || stat.size > 512000) throw new Error();
      value = readFileSync(filePath, 'utf8');
    } catch {
      throw new Error(`Cannot read ${fileKey}; expected a readable secret file up to 500 KiB.`);
    }

    // Remove one trailing text-file terminator LF/CRLF, preserving internal spaces
    value = value.replace(/\r?\n$/, '');
    if (!value.trim() || value.includes('\0')) {
      throw new Error(`${fileKey} contains an empty or invalid secret.`);
    }
    resolved[name] = value;
  }

  // A failed read must not partially modify the process configuration.
  Object.assign(environment, resolved);
}

export { createSecretProvider, parseDatabaseSecret, parseJwtSecret };

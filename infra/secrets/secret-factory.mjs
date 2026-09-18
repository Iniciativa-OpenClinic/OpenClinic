import { FileSecretProvider } from './providers/file-provider.mjs';
import { GsmSecretProvider } from './providers/gsm-provider.mjs';
import { AwsSecretProvider } from './providers/aws-provider.mjs';
import { EnvProvider } from './providers/env-provider.mjs';
import { SECRETS_PROVIDER, SUPPORTED_SECRETS_PROVIDERS, secretsMode } from './runtime.mjs';

/**
 * Creates the appropriate SecretProvider instance based on configuration.
 *
 * @param {Record<string, string | undefined>} environment
 * @returns {FileSecretProvider | GsmSecretProvider | AwsSecretProvider | EnvProvider}
 */
export function createSecretProvider(environment = process.env) {
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

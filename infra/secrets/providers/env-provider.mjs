/**
 * Pass-through provider for minimal or direct-env setups (SECRETS_PROVIDER=env).
 */
export class EnvProvider {
  constructor() {
    this.name = 'env';
  }

  getSecret(secretName) {
    throw new Error(
      `Cannot resolve secret "${secretName}" when SECRETS_PROVIDER=env. ` +
      `Configure direct atomic environment variables (DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME, JWT_KEY) or set SECRETS_PROVIDER=file.`
    );
  }
}

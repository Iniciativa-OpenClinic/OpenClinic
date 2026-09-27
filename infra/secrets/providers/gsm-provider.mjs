/**
 * Google Cloud Secret Manager (GSM) provider adapter.
 * Uses lazy dynamic import so the core template runs without requiring @google-cloud/secret-manager.
 */
export class GsmSecretProvider {
  constructor() {
    this.name = 'gsm';
  }

  async getSecret(secretName, environment = process.env) {
    let SecretManagerServiceClient;
    try {
      // Dynamic import
      const module = await import('@google-cloud/secret-manager');
      SecretManagerServiceClient = module.SecretManagerServiceClient;
    } catch {
      throw new Error(
        'GSM provider requested (SECRETS_PROVIDER=gsm), but "@google-cloud/secret-manager" is not installed. ' +
        'Please run: npm install @google-cloud/secret-manager'
      );
    }

    const client = new SecretManagerServiceClient();
    const projectId = environment.GCP_PROJECT_ID;
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID is required in environment when SECRETS_PROVIDER=gsm.');
    }

    const name = secretName.startsWith('projects/')
      ? secretName
      : `projects/${projectId}/secrets/${secretName}/versions/latest`;

    try {
      const [version] = await client.accessSecretVersion({ name });
      const payload = version.payload?.data?.toString();
      if (!payload) {
        throw new Error(`Secret "${secretName}" in GSM returned an empty payload.`);
      }
      return payload;
    } catch (error) {
      throw new Error(`Failed to retrieve secret "${secretName}" from GSM: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

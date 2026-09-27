/**
 * AWS Secrets Manager provider adapter.
 * Uses lazy dynamic import so the core template runs without requiring @aws-sdk/client-secrets-manager.
 */
export class AwsSecretProvider {
  constructor() {
    this.name = 'aws';
  }

  async getSecret(secretName, environment = process.env) {
    let SecretsManagerClient, GetSecretValueCommand;
    try {
      const module = await import('@aws-sdk/client-secrets-manager');
      SecretsManagerClient = module.SecretsManagerClient;
      GetSecretValueCommand = module.GetSecretValueCommand;
    } catch {
      throw new Error(
        'AWS provider requested (SECRETS_PROVIDER=aws), but "@aws-sdk/client-secrets-manager" is not installed. ' +
        'Please run: npm install @aws-sdk/client-secrets-manager'
      );
    }

    const region = environment.AWS_REGION || 'us-east-1';
    const client = new SecretsManagerClient({ region });

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await client.send(command);
      if (response.SecretString) {
        return response.SecretString;
      }
      if (response.SecretBinary) {
        return Buffer.from(response.SecretBinary).toString('utf8');
      }
      throw new Error(`Secret "${secretName}" in AWS Secrets Manager has no string or binary content.`);
    } catch (error) {
      throw new Error(`Failed to retrieve secret "${secretName}" from AWS: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

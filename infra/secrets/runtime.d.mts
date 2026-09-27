import type { SecretsProviderType } from '@openclinic/core';

export type SecretEnvironment = Record<string, string | undefined>;
export const SECRET_NAMES: readonly string[];
export function secretsMode(environment?: SecretEnvironment): SecretsProviderType;
export function loadSecretFiles(environment?: SecretEnvironment): void;
export function parseDatabaseSecret(rawContent: string, secretIdentifier?: string, environment?: SecretEnvironment): string;
export function parseJwtSecret(rawContent: string, secretIdentifier?: string): string;

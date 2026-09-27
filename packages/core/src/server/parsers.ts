/**
 * Parses raw database secret content (JSON or connection string) into a PostgreSQL URL.
 * Throws a descriptive error if the content is invalid. Never logs passwords.
 */
export function parseDatabaseSecret(
  rawContent: string,
  secretIdentifier: string = 'database',
  environment?: Record<string, string | undefined>
): string {
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error(`Database secret "${secretIdentifier}" is empty.`);
  }

  const trimmed = rawContent.trim();

  // 1. Check if the content is a JSON object
  if (trimmed.startsWith('{')) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(`Database secret "${secretIdentifier}" contains invalid JSON.`);
    }

    if (parsed.url && typeof parsed.url === 'string') {
      return validateAndNormalizePgUrl(parsed.url, secretIdentifier);
    }

    const host = environment?.['DB_HOST'] || (parsed.host as string) || 'localhost';
    const port = environment?.['DB_PORT'] || (parsed.port ? String(parsed.port) : '5432');
    const database = (parsed.database as string) || (parsed.db as string) || environment?.['DB_NAME'];
    const user = (parsed.user as string) || (parsed.username as string);
    const pass = parsed.password !== undefined ? (parsed.password as string) : (parsed.pass as string);

    if (!database || !user) {
      throw new Error(
        `Database secret "${secretIdentifier}" JSON must specify at least "database" and "user".`
      );
    }

    const encodedUser = encodeURIComponent(String(user));
    const encodedPass = pass !== undefined ? `:${encodeURIComponent(String(pass))}` : '';
    return `postgresql://${encodedUser}${encodedPass}@${host}:${port}/${database}`;
  }

  // 2. Raw connection string
  if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
    return validateAndNormalizePgUrl(trimmed, secretIdentifier);
  }

  throw new Error(
    `Database secret "${secretIdentifier}" must be formatted as JSON or a postgresql:// connection string.`
  );
}

function validateAndNormalizePgUrl(url: string, secretIdentifier: string): string {
  try {
    const parsed = new URL(url);
    if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
      throw new Error();
    }
    if (!parsed.hostname || parsed.pathname.length < 2) {
      throw new Error();
    }
    return url;
  } catch {
    throw new Error(`Database secret "${secretIdentifier}" contains an invalid PostgreSQL URL.`);
  }
}

/**
 * Parses raw JWT secret content (JSON or raw key string).
 */
export function parseJwtSecret(rawContent: string, secretIdentifier: string = 'jwt'): string {
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error(`JWT secret "${secretIdentifier}" is empty.`);
  }

  const trimmed = rawContent.trim();

  // 1. Check if the content is a JSON object
  if (trimmed.startsWith('{')) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(`JWT secret "${secretIdentifier}" contains invalid JSON.`);
    }

    const key = (parsed.secretKey || parsed.jwt_secret_key || parsed.key || parsed.secret) as string | undefined;
    if (!key || typeof key !== 'string') {
      throw new Error(
        `JWT secret "${secretIdentifier}" JSON must contain a string property "secretKey".`
      );
    }
    if (key.length < 16) {
      throw new Error(`JWT secret "${secretIdentifier}" must be at least 16 characters.`);
    }
    return key;
  }

  // 2. Raw string
  const cleaned = trimmed.replace(/\r?\n$/, '');
  if (cleaned.length < 16) {
    throw new Error(`JWT secret "${secretIdentifier}" must be at least 16 characters.`);
  }
  return cleaned;
}

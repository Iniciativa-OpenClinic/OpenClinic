/**
 * Parses raw database secret content (JSON or connection string) into a PostgreSQL URL.
 * Throws a descriptive error if the content is invalid. Never logs passwords.
 *
 * @param {string} rawContent
 * @param {string} secretIdentifier
 * @returns {string} Fully encoded postgresql:// connection URL
 */
export function parseDatabaseSecret(rawContent, secretIdentifier = 'database') {
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error(`Database secret "${secretIdentifier}" is empty.`);
  }

  const trimmed = rawContent.trim();

  // 1. Check if the content is a JSON object
  if (trimmed.startsWith('{')) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(`Database secret "${secretIdentifier}" contains invalid JSON.`);
    }

    if (parsed.url && typeof parsed.url === 'string') {
      return validateAndNormalizePgUrl(parsed.url, secretIdentifier);
    }

    const host = parsed.host || 'localhost';
    const port = parsed.port ? String(parsed.port) : '5432';
    const database = parsed.database || parsed.db;
    const user = parsed.user || parsed.username;
    const pass = parsed.password !== undefined ? parsed.password : parsed.pass;

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

function validateAndNormalizePgUrl(url, secretIdentifier) {
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

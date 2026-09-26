/**
 * Parses raw JWT secret content (JSON or raw key string).
 *
 * @param {string} rawContent
 * @param {string} secretIdentifier
 * @returns {string} The secret key string
 */
export function parseJwtSecret(rawContent, secretIdentifier = 'jwt') {
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error(`JWT secret "${secretIdentifier}" is empty.`);
  }

  const trimmed = rawContent.trim();

  // 1. Check if the content is a JSON object
  if (trimmed.startsWith('{')) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(`JWT secret "${secretIdentifier}" contains invalid JSON.`);
    }

    const key = parsed.secretKey || parsed.jwt_secret_key || parsed.key || parsed.secret;
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

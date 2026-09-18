import { readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileSecretProvider {
  constructor(options = {}) {
    this.name = 'file';
    this.secretsDir = options.secretsDir;
  }

  /**
   * Discovers the candidate search directories for secrets.
   * Handles running from monorepo root or packages/backend-api / packages/backend-cli.
   */
  getSearchDirectories(environment = process.env) {
    const customDir = environment.SECRETS_DIR || this.secretsDir;
    const dirs = [];

    if (customDir) {
      dirs.push(path.resolve(process.cwd(), customDir));
    }

    // Standard candidates
    dirs.push(
      '/run/secrets',
      path.resolve(process.cwd(), 'secrets'),
      path.resolve(process.cwd(), '../../secrets'),
      path.resolve(process.cwd(), '../secrets'),
      path.resolve(__dirname, '../../../secrets')
    );

    // Filter unique valid paths
    return [...new Set(dirs)];
  }

  /**
   * Resolves the secret file path from a logical name.
   * @param {string} logicalName - e.g. "database-app", "jwt-secret", or an absolute path
   * @param {Record<string, string | undefined>} environment
   * @returns {string} Absolute path to existing secret file
   */
  resolveSecretPath(logicalName, environment = process.env) {
    if (!logicalName || typeof logicalName !== 'string') {
      throw new Error(`Invalid secret identifier: "${logicalName}".`);
    }

    // 1. Direct explicit file path
    if (path.isAbsolute(logicalName) && existsSync(logicalName)) {
      return logicalName;
    }

    // Direct relative file if exists
    const directCwd = path.resolve(process.cwd(), logicalName);
    if (existsSync(directCwd) && statSync(directCwd).isFile()) {
      return directCwd;
    }

    const directories = this.getSearchDirectories(environment);
    const candidateFilenames = [
      logicalName,
      `${logicalName}.credentials.json`,
      `${logicalName}.json`,
      `${logicalName}.credentials`,
      `${logicalName}.key`,
      `${logicalName}.secret`,
    ];

    if (logicalName === 'database-secret-app' || logicalName === 'database-app') {
      candidateFilenames.push(
        'database-secret-app.credentials.json',
        'database-secret-app.json',
        'database-secret-app',
        'database-app.credentials.json',
        'database-app.json',
        'database-app'
      );
    } else if (logicalName === 'database-secret-owner' || logicalName === 'database-owner') {
      candidateFilenames.push(
        'database-secret-owner.credentials.json',
        'database-secret-owner.json',
        'database-secret-owner',
        'database-owner.credentials.json',
        'database-owner.json',
        'database-owner'
      );
    } else if (logicalName === 'jwt-secret' || logicalName === 'jwt_secret') {
      candidateFilenames.push(
        'jwt-secret.credentials.json',
        'jwt-secret.json',
        'jwt.credentials.json',
        'jwt.json',
        'jwt.key',
        'jwt.secret'
      );
    } else if (logicalName === 'jwt') {
      candidateFilenames.push('jwt-secret.credentials.json', 'jwt-secret.json', 'jwt_secret.credentials.json');
    }

    for (const dir of directories) {
      for (const filename of candidateFilenames) {
        const fullPath = path.resolve(dir, filename);
        if (existsSync(fullPath)) {
          try {
            const stat = statSync(fullPath);
            if (stat.isFile()) {
              return fullPath;
            }
          } catch {
            // Ignore stat errors and continue searching
          }
        }
      }
    }

    throw new Error(
      `Secret file for "${logicalName}" not found. Searched candidate directories: ${directories.join(', ')}.`
    );
  }

  /**
   * Reads raw secret content from disk.
   * @param {string} logicalName
   * @param {Record<string, string | undefined>} environment
   * @returns {string}
   */
  getSecret(logicalName, environment = process.env) {
    const filePath = this.resolveSecretPath(logicalName, environment);

    try {
      const stat = statSync(filePath);
      if (!stat.isFile() || stat.size > 512000) {
        throw new Error(`Secret file "${filePath}" exceeds maximum size (500 KiB) or is not a regular file.`);
      }
      const content = readFileSync(filePath, 'utf8');
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

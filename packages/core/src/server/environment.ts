import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { loadSecretFiles, type SecretEnvironment } from './secrets.js';

export interface LoadEnvironmentOptions {
  cwd?: string;
  customEnvPath?: string;
  environment?: SecretEnvironment;
}

/**
 * Encapsulates deterministic .env discovery and secret resolution for server runtimes.
 * Deduplicates environment loading across backend-api, backend-cli, and test runners.
 */
export function loadEnvironment(options: LoadEnvironmentOptions = {}): SecretEnvironment {
  const environment = options.environment ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const loadFile = (file: string): void => {
    const values = dotenv.parse(fs.readFileSync(file));
    for (const [key, value] of Object.entries(values)) {
      if (environment[key] === undefined) environment[key] = value;
    }
  };

  // Load .env for non-secret configuration variables (ports, hosts, secret names)
  if (options.customEnvPath && fs.existsSync(options.customEnvPath)) {
    loadFile(options.customEnvPath);
  } else {
    const candidates = [
      path.resolve(cwd, '.env'),
      path.resolve(cwd, '../.env'),
      path.resolve(cwd, '../../.env'),
      path.resolve(cwd, '../../../.env'),
      path.resolve(cwd, '../../../../.env'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        loadFile(p);
        break;
      }
    }
  }

  loadSecretFiles(environment);
  return environment;
}

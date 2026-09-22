import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { loadSecretFiles, secretsMode } from './runtime.mjs';

function fixture(run) {
  const root = resolve('.temp');
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, 'secret-test-'));
  const file = join(directory, 'secret');
  try { run(file, directory); } finally { rmSync(directory, { recursive: true }); }
}

test('uses direct environment configuration in development', () => {
  const env = { JWT_KEY: 'development-value' };
  loadSecretFiles(env);
  assert.equal(env.JWT_KEY, 'development-value');
  assert.equal(secretsMode(env), 'env');
});

test('explicit files override development env, preserving spaces and removing one CRLF', () => fixture(file => {
  writeFileSync(file, '  secret with spaces  \r\n');
  const env = { JWT_KEY: 'old', JWT_KEY_FILE: file };
  loadSecretFiles(env);
  assert.equal(env.JWT_KEY, '  secret with spaces  ');
}));

test('files mode resolves the configured secret', () => fixture(file => {
  writeFileSync(file, 'correct-value');
  const env = { SECRETS_PROVIDER: 'file', JWT_KEY_FILE: file };
  loadSecretFiles(env);
  assert.equal(env.JWT_KEY, 'correct-value');
}));

test('files mode rejects direct secret values, even when a file is also configured', () => fixture(file => {
  writeFileSync(file, 'correct-value');
  assert.throws(() => loadSecretFiles({ SECRETS_PROVIDER: 'file', JWT_KEY: 'leak-marker', JWT_KEY_FILE: file }),
    error => error.message.includes('JWT_KEY_FILE') && !error.message.includes('leak-marker'));
}));

test('missing file fails without falling back or exposing the path or old value', () => {
  assert.throws(() => loadSecretFiles({ JWT_KEY: 'old-marker', JWT_KEY_FILE: '/missing/path-marker' }),
    error => /Cannot read JWT_KEY_FILE/.test(error.message) && !/old-marker|path-marker/.test(error.message));
});

test('empty, invalid, oversized and non-file inputs fail', () => fixture((file, directory) => {
  for (const contents of ['', '\r\n', ' \n', 'value\0', 'x'.repeat(512001)]) {
    writeFileSync(file, contents);
    assert.throws(() => loadSecretFiles({ JWT_KEY_FILE: file }));
  }
  assert.throws(() => loadSecretFiles({ JWT_KEY_FILE: directory }));
  assert.throws(() => loadSecretFiles({ JWT_KEY_FILE: '' }));
}));

test('failure is atomic and unknown file variables are not read', () => fixture(file => {
  writeFileSync(file, 'new-value');
  const env = { DATABASE_URL: 'original', DATABASE_URL_FILE: file, JWT_KEY_FILE: '/missing' };
  assert.throws(() => loadSecretFiles(env));
  assert.equal(env.DATABASE_URL, 'original');
  assert.doesNotThrow(() => loadSecretFiles({ UNRELATED_FILE: '/missing' }));
}));

test('invalid mode fails without printing its value', () => {
  assert.throws(() => secretsMode({ SECRETS_MODE: 'invalid-marker' }),
    error => !error.message.includes('invalid-marker'));
  assert.throws(() => secretsMode({ SECRETS_PROVIDER: 'invalid-provider' }),
    error => !error.message.includes('invalid-provider'));
});

test('resolves structured database JSON secrets for DB_APP_SECRET_NAME and DB_OWNER_SECRET_NAME', () => fixture((file, directory) => {
  const appSecretPath = join(directory, 'database-secret-app.json');
  const ownerSecretPath = join(directory, 'database-secret-owner.json');

  writeFileSync(appSecretPath, JSON.stringify({
    host: 'db.internal',
    port: 5433,
    database: 'my_app_db',
    user: 'app_user',
    password: 'secret@password'
  }));

  writeFileSync(ownerSecretPath, JSON.stringify({
    url: 'postgresql://owner_user:owner_pass@db.internal:5433/my_app_db'
  }));

  const env = {
    SECRETS_PROVIDER: 'file',
    SECRETS_DIR: directory,
    DB_APP_SECRET_NAME: 'database-secret-app',
    DB_OWNER_SECRET_NAME: 'database-secret-owner',
  };

  loadSecretFiles(env);
  assert.equal(env.DATABASE_URL, 'postgresql://app_user:secret%40password@db.internal:5433/my_app_db');
  assert.equal(env.DATABASE_OWNER_URL, 'postgresql://owner_user:owner_pass@db.internal:5433/my_app_db');
}));

test('resolves raw text JWT secret for JWT_SECRET_NAME', () => fixture((file, directory) => {
  const jwtSecretPath = join(directory, 'jwt.txt');
  writeFileSync(jwtSecretPath, 'my-super-secret-jwt-key-with-at-least-32-chars!!\n');

  const env = {
    SECRETS_PROVIDER: 'file',
    SECRETS_DIR: directory,
    JWT_SECRET_NAME: 'jwt',
  };

  loadSecretFiles(env);
  assert.equal(env.JWT_KEY, 'my-super-secret-jwt-key-with-at-least-32-chars!!');
}));

test('malformed JSON in database secret throws descriptive error', () => fixture((file, directory) => {
  const badSecretPath = join(directory, 'database-secret-app.json');
  writeFileSync(badSecretPath, '{ invalid json');

  const env = {
    SECRETS_PROVIDER: 'file',
    SECRETS_DIR: directory,
    DB_APP_SECRET_NAME: 'database-secret-app',
  };

  assert.throws(() => loadSecretFiles(env), /contains invalid JSON/);
}));

test('rejects direct credentials atomically when SECRETS_PROVIDER=file', () => fixture((file, directory) => {
  const appSecretPath = join(directory, 'database-secret-app.json');
  writeFileSync(appSecretPath, JSON.stringify({
    host: 'db.internal',
    port: 5432,
    database: 'my_app_db',
    user: 'app_user',
    password: 'secret_password',
  }));

  const env = {
    SECRETS_PROVIDER: 'file',
    SECRETS_DIR: directory,
    DB_APP_SECRET_NAME: 'database-secret-app',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_NAME: 'fallback_db',
    DB_USER: 'fallback_user',
    DB_PASS: 'fallback_pass',
    JWT_KEY: 'fallback-jwt-key',
  };

  assert.throws(() => loadSecretFiles(env), /must be supplied through/);
  assert.equal(env.DATABASE_URL, undefined);
  assert.equal(env.JWT_KEY, 'fallback-jwt-key');
}));

test('operates in direct mode when SECRETS_PROVIDER=env', () => {
  const env = { SECRETS_PROVIDER: 'env', JWT_KEY: 'my-atomic-key' };
  loadSecretFiles(env);
  assert.equal(env.JWT_KEY, 'my-atomic-key');
  assert.equal(secretsMode(env), 'env');
});



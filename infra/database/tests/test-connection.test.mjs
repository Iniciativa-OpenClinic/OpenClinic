import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testDatabaseUrl } from '../test-connection.mjs';
const atoms = { DB_HOST:'127.0.0.1', DB_PORT:'55439', DB_NAME:'postgres', DB_USER:'user@local', DB_PASS:'p:@/#?' };
test('atomic database credentials survive URL encoding', () => {
  const url = new URL(testDatabaseUrl(atoms));
  assert.equal(decodeURIComponent(url.username), atoms.DB_USER);
  assert.equal(decodeURIComponent(url.password), atoms.DB_PASS);
});
test('database tests refuse application targets, external hosts and missing credentials', () => {
  for (const patch of [{ DB_HOST:'remote.invalid' }, { DB_NAME:'openclinic_template' }, { DB_PASS:'' }, { DB_PORT:'0' }]) assert.throws(() => testDatabaseUrl({...atoms,...patch}));
});

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export function testDatabaseUrl(environment = process.env) {
  const file = fileURLToPath(new URL('../../.env', import.meta.url));
  const config = { ...(fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {}), ...environment };
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS']) {
    if (!config[key]) throw new Error('Database tests require explicit DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASS.');
  }
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(config.DB_HOST)) throw new Error('Database tests require a loopback server.');
  if (config.DB_NAME !== 'postgres') throw new Error('Database tests require DB_NAME=postgres on a disposable server; application databases are refused.');
  const port = Number(config.DB_PORT);
  if (!/^\d+$/.test(config.DB_PORT) || port < 1 || port > 65535) throw new Error('Invalid DB_PORT for database tests.');
  const host = config.DB_HOST === '::1' ? '[::1]' : config.DB_HOST;
  const url = new URL('postgresql://' + host + ':' + port + '/postgres');
  url.username = config.DB_USER;
  url.password = config.DB_PASS;
  return url.toString();
}

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { generateDrizzleJson } from 'drizzle-kit/api';
import * as schema from '../../packages/backend-api/src/arch/infrastructure/database/drizzle-schema.js';
import { loadMigrations, migrationsDirectory, databaseDirectory } from '../../packages/backend-cli/src/utils/migration-runner.js';

async function verify() {
  const migrations = loadMigrations();
  const snapshots = fs.readdirSync(path.join(migrationsDirectory, 'meta')).filter(file => file.endsWith('_snapshot.json')).sort();
  const previous = JSON.parse(fs.readFileSync(path.join(migrationsDirectory, 'meta', snapshots.at(-1)!), 'utf8'));
  const current = generateDrizzleJson(schema, previous.id);
  // Comparing metadata never opens the generator's interactive rename prompts in CI.
  for (const key of ['tables', 'enums', 'schemas', 'sequences', 'roles', 'policies', 'views'] as const) {
    assert.deepEqual(JSON.parse(JSON.stringify(current[key] ?? {})), previous[key] ?? {}, `Drizzle ${key} changed without a generated migration.`);
  }
  const fixture = JSON.parse(fs.readFileSync(path.join(databaseDirectory, 'baseline-schema.json'), 'utf8'));
  assert.equal(fixture.hash, migrations[0]!.hash, 'Baseline fixture does not match SQL');
  for (const migration of migrations) {
    const sql = fs.readFileSync(path.join(migrationsDirectory, migration.tag + '.sql'), 'utf8');
    assert.ok(!sql.includes('\r'), 'Migration SQL must use LF endings for stable checksums.');
  }
  console.log(`Verified ${migrations.length} migrations, snapshots and baseline checksum.`);
}
verify().catch(error => { console.error(error); process.exitCode = 1; });

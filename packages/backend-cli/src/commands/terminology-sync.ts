import postgres from 'postgres';
import { syncSource, syncAllSources } from '@openclinic/terminology/sync';
import { allAdapters, adapterByCode } from '@openclinic/terminology/adapters';
import { resolveDatabaseTarget, type DatabaseOptions } from '../utils/database-connection.js';

export interface TerminologySyncOptions extends DatabaseOptions {
  source?: string;
  resume?: boolean;
}

// terminology:sync is a third category of database operation, distinct from db:migrate
// (static, versioned schema plus small bootstrap-constant rows) and db:seed --demo
// (local-only, refuses if any operational table is populated). It fetches live external
// data and must be safely re-runnable against an already-populated table — that is the
// entire point of the versioning mechanic in @openclinic/terminology's sync engine — and is
// meaningful against --target remote in ongoing operation. Do not fold this into either of
// those commands.
export async function terminologySync(options: TerminologySyncOptions = {}): Promise<void> {
  const destination = resolveDatabaseTarget(options, true);
  const sql = postgres(destination.url, { max: 1, connect_timeout: 10 });

  console.log('============================================================');
  console.log('  Terminology Sync');
  console.log('============================================================\n');

  try {
    // syncSource/syncAllSources print their own [RESUME]/[..]/[OK|SKIP]/[FAILED] lines
    // (including bytes/pages/elapsed) as they go — the CLI only decides the exit code here.
    const results = options.source
      ? [await syncSource(sql, adapterByCode(options.source))]
      : await syncAllSources(sql, allAdapters, { resume: options.resume });

    if (results.some((result) => result.status === 'FAILED')) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

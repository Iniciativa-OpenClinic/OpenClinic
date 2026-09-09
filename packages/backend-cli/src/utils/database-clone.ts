import path from 'node:path';
import postgres from 'postgres';
import { executePgDump, executePgRestore, type PgConnectionConfig } from './pg-runner.js';
import { inspectMigrations, MIGRATION_LOCK } from './migration-runner.js';

function connectionUrl(config: PgConnectionConfig, database = config.database) {
  const url = new URL(config.connectionUrl ?? `postgresql://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password ?? '')}@${config.host}:${config.port}/${config.database}`);
  url.pathname = `/${database}`;
  return url.toString();
}

/** Restore and validate a new database before switching names. Keep the old database for recovery. */
export async function cloneVersionedDatabase(local: PgConnectionConfig, remote: PgConnectionConfig) {
  const source = postgres(connectionUrl(local), { max: 1, connect_timeout: 10 });
  const target = postgres(connectionUrl(remote), { max: 1, connect_timeout: 10 });
  const stamp = Date.now();
  const stage = `oc_clone_${stamp}`;
  const archive = `oc_previous_${stamp}`;
  const sourceDump = path.resolve('backups', `clone-source-${stamp}.dump`);
  const targetDump = path.resolve('backups', `clone-target-${stamp}.dump`);
  let targetBlocked = false;
  let switched = false;
  const admin = postgres(connectionUrl(remote, 'postgres'), { max: 1, connect_timeout: 10 });
  try {
    const [database] = await target`SELECT pg_encoding_to_char(encoding) AS encoding, datcollate, datctype,
      datlocprovider, datconnlimit, pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = current_database()`;
    if (database!.datlocprovider !== 'c') throw new Error('Clone requires a reviewed staging setup for non-libc locale providers.');
    if (database!.owner !== remote.user) throw new Error('Use the destination database owner for cloning, with CREATEDB.');
    const grants = await target`SELECT a.grantee, CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS role,
      a.privilege_type, a.is_grantable FROM pg_database d,
      LATERAL aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a WHERE d.datname = current_database()`;
    const settings = await target`SELECT s.setrole, pg_get_userbyid(s.setrole) AS role, unnest(s.setconfig) AS setting
      FROM pg_db_role_setting s JOIN pg_database d ON d.oid = s.setdatabase WHERE d.datname = current_database()`;
    const [sourceIdentity] = await source`SELECT inet_server_addr()::text AS host, inet_server_port() AS port, current_database() AS database`;
    const [targetIdentity] = await target`SELECT inet_server_addr()::text AS host, inet_server_port() AS port, current_database() AS database`;
    if (JSON.stringify(sourceIdentity) === JSON.stringify(targetIdentity)) throw new Error('Source and destination resolve to the same database.');
    const [sourceLock] = await source`SELECT pg_try_advisory_lock(${MIGRATION_LOCK}) AS acquired`;
    const [targetLock] = await target`SELECT pg_try_advisory_lock(${MIGRATION_LOCK}) AS acquired`;
    if (!sourceLock?.acquired || !targetLock?.acquired) throw new Error('A migration or clone is already running.');
    const state = await inspectMigrations(source);
    if (state.pending.length || state.needsBaseline) throw new Error('Source must have all migrations applied before cloning.');
    const [privilege] = await admin`SELECT rolcreatedb OR rolsuper AS allowed FROM pg_roles WHERE rolname = current_user`;
    if (!privilege?.allowed) throw new Error('Safe cloning requires a maintenance role with CREATEDB; no permissions were changed.');
    // The operator must stop every writer before invoking this exceptional operation.
    const [writers] = await target`SELECT count(*)::int AS count FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid() AND backend_type = 'client backend'`;
    if (writers!.count) throw new Error('Destination still has client connections. Stop API/workers and close database sessions first.');
    const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";
    // Values come from PostgreSQL metadata and are escaped as SQL literals (DDL does not accept bind parameters).
    await admin.unsafe(`CREATE DATABASE "${stage}" TEMPLATE template0 ENCODING ${literal(database!.encoding)} LC_COLLATE ${literal(database!.datcollate)} LC_CTYPE ${literal(database!.datctype)}`);
    await admin.unsafe(`ALTER DATABASE "${stage}" CONNECTION LIMIT ${Number(database!.datconnlimit)}`);
    await admin`REVOKE ALL ON DATABASE ${admin(stage)} FROM PUBLIC`;
    for (const grant of grants) {
      if (!['CONNECT', 'CREATE', 'TEMPORARY'].includes(grant.privilege_type)) throw new Error('Unexpected database privilege.');
      const role = grant.grantee === 0 ? 'PUBLIC' : '"' + grant.role.replaceAll('"', '""') + '"';
      await admin.unsafe(`GRANT ${grant.privilege_type} ON DATABASE "${stage}" TO ${role}${grant.is_grantable ? ' WITH GRANT OPTION' : ''}`);
    }
    for (const setting of settings) {
      const separator = setting.setting.indexOf('=');
      const name = setting.setting.slice(0, separator).replaceAll('"', '""');
      const value = literal(setting.setting.slice(separator + 1));
      const subject = setting.setrole === 0 ? `DATABASE "${stage}"`
        : `ROLE "${setting.role.replaceAll('"', '""')}" IN DATABASE "${stage}"`;
      await admin.unsafe(`ALTER ${subject} SET "${name}" TO ${value}`);
    }
    console.log(`Staging database: ${stage}`);
    await executePgDump({ ...remote, outputPath: targetDump });
    await executePgDump({ ...local, outputPath: sourceDump });
    console.log(`Recovery backups: ${targetDump} | ${sourceDump}`);
    await executePgRestore({ ...remote, database: stage, connectionUrl: connectionUrl(remote, stage), inputPath: sourceDump });
    const restored = postgres(connectionUrl(remote, stage), { max: 1, connect_timeout: 10 });
    try {
      const restoredState = await inspectMigrations(restored);
      if (restoredState.pending.length || restoredState.applied !== state.applied) throw new Error('Restored migration history does not match source.');
      const [constraints] = await restored`SELECT count(*)::int AS count FROM pg_constraint WHERE NOT convalidated`;
      if (constraints!.count) throw new Error('Restored database has unvalidated constraints.');
      // Sessions and password-reset tokens are environment-specific credentials, not demo fixtures.
      await restored.begin(async sql => {
        await sql`DELETE FROM iam_sessions`;
        await sql`UPDATE iam_users SET password_reset_token = NULL, password_reset_expires_at = NULL
          WHERE password_reset_token IS NOT NULL OR password_reset_expires_at IS NOT NULL`;
      });
    } finally { await restored.end(); }
    await admin`ALTER DATABASE ${admin(remote.database)} ALLOW_CONNECTIONS false`;
    targetBlocked = true;
    // Fail rather than terminate a tester connection that appeared during preparation.
    const [connections] = await target`SELECT count(*)::int AS count FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid() AND backend_type = 'client backend'`;
    if (connections!.count) throw new Error('A client connected during clone preparation. Cutover cancelled.');
    await target.end();
    await admin.begin(async sql => {
      await sql`SET LOCAL lock_timeout = '5s'`;
      await sql`ALTER DATABASE ${sql(remote.database)} RENAME TO ${sql(archive)}`;
      await sql`ALTER DATABASE ${sql(stage)} RENAME TO ${sql(remote.database)}`;
      await sql`ALTER DATABASE ${sql(remote.database)} ALLOW_CONNECTIONS true`;
    });
    switched = true;
    console.log(`Clone completed. Previous database retained as ${archive} with connections disabled.`);
    console.log('Restart the matching application release and validate login. Old sessions were not copied.');
  } finally {
    if (targetBlocked && !switched) {
      try { await admin`ALTER DATABASE ${admin(remote.database)} ALLOW_CONNECTIONS true`; }
      catch { console.error('CRITICAL: re-enable ALLOW_CONNECTIONS on the destination before resuming service.'); }
    }
    await source.end();
    await target.end();
    await admin.end();
    if (!switched) console.log(`Clone not completed. Original destination preserved; inspect staging ${stage} and backups before retrying.`);
  }
}

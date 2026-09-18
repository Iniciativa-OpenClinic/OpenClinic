import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { testPgConnection, PgConnectionConfig } from '../utils/pg-runner.js';
import { getDatabaseConfig, resolveDatabaseTarget } from '../utils/database-connection.js';
import { cloneVersionedDatabase } from '../utils/database-clone.js';
import { databaseDirectory } from '../utils/migration-runner.js';
import { UserRole } from '@openclinic/core';

export enum DbSyncRemoteMode {
  AUDIT = 'audit',
  CLONE = 'clone',
  USERS = 'users',
}

export interface DbSyncRemoteOptions {
  mode?: DbSyncRemoteMode;
  remoteHost?: string;
  force?: boolean;
  maintenance?: boolean;
  confirmTarget?: string;
}

export enum UserPresenceStatus {
  ONLINE = 'ONLINE',
  IDLE_RECENT = 'IDLE_RECENT',
  INACTIVE = 'INACTIVE',
}

export interface ActiveUserInfo {
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  latestIp: string | null;
  activeSessionCount: number;
  lastLoginAt: Date;
  lastActivityAt: Date | null;
  minutesSinceLastActivity: number | null;
  presence: UserPresenceStatus;
}

export interface ActiveSessionInfo {
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}

interface TableSummary {
  table: string;
  localCount: number | string;
  remoteCount: number | string;
  diffCount: number | string;
  status: 'COHERENT' | 'DRIFT' | 'MISSING_IN_REMOTE' | 'MISSING_IN_DEV';
}

/**
 * Reads the initial table inventory; live catalogs supply subsequently added tables.
 */
function getExpectedTablesFromSchema(): string[] {
  const possiblePaths = [path.join(databaseDirectory, 'migrations/0000_baseline.sql')];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        const matches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)/gi);
        return Array.from(matches, (m) => m[1]!.toLowerCase());
      } catch {
        // Fallback
      }
    }
  }
  return [];
}

/**
 * Resolve connection parameters for local database from environment
 */
function resolveLocalConfig(): PgConnectionConfig {
  const { url, parsed } = resolveDatabaseTarget();
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    connectionUrl: url,
  };
}

/**
 * Builds PostgreSQL connection URL string from config
 */
function buildConnectionUrl(config: PgConnectionConfig): string {
  return (
    config.connectionUrl ??
    `postgresql://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password || '')}@${config.host}:${config.port}/${config.database}`
  );
}

/**
 * Prompt remote connection settings
 */
async function promptRemoteConfig(defaultHost?: string): Promise<PgConnectionConfig> {
  const config = getDatabaseConfig();

  if (process.env['REMOTE_DATABASE_OWNER_URL'] && !defaultHost) {
    const connectionUrl = process.env['REMOTE_DATABASE_OWNER_URL'];
    const url = new URL(connectionUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 5432),
      database: decodeURIComponent(url.pathname.slice(1)),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      connectionUrl,
    };
  }
  const envRemoteUrl = process.env['DATABASE_REMOTE_URL'];
  let parsedRemote: Partial<PgConnectionConfig> = {};
  if (envRemoteUrl) {
    try {
      const p = new URL(envRemoteUrl);
      parsedRemote = {
        host: p.hostname,
        port: p.port ? parseInt(p.port, 10) : 5432,
        database: p.pathname.replace(/^\//, '') || config.database,
        user: decodeURIComponent(p.username || config.ownerUser),
        password: decodeURIComponent(p.password || config.ownerPassword || ''),
      };
    } catch {
      // Keep defaults
    }
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'host',
      message: 'Remote target server host / IP:',
      default: defaultHost || parsedRemote.host,
      validate: (v: string) => v.trim().length > 0 || 'Host is required.',
    },
    {
      type: 'input',
      name: 'port',
      message: 'Remote PostgreSQL port:',
      default: String(parsedRemote.port || config.port),
      validate: (v: string) => !isNaN(parseInt(v, 10)) || 'Invalid port.',
    },
    {
      type: 'input',
      name: 'database',
      message: 'Remote database name:',
      default: parsedRemote.database || config.database,
    },
    {
      type: 'input',
      name: 'user',
      message: 'Remote user (owner with DDL privileges):',
      default: parsedRemote.user || config.ownerUser,
    },
    {
      type: 'password',
      name: 'password',
      message: 'Remote user password:',
      default: parsedRemote.password || config.ownerPassword,
      mask: '*',
      validate: (v: string) => v.length > 0 || 'Password is required.',
    },
  ]);

  return {
    host: answers.host.trim(),
    port: parseInt(answers.port.trim(), 10),
    database: answers.database.trim(),
    user: answers.user.trim(),
    password: answers.password,
    isLocal: false,
  };
}

/**
 * Run drift audit between local dev database and remote database
 */
async function runDriftAudit(localConfig: PgConnectionConfig, remoteConfig: PgConnectionConfig): Promise<boolean> {
  console.log('\n------------------------------------------------------------');
  console.log('  [1/3] Starting Coherence Audit (Dev vs Remote)            ');
  console.log('------------------------------------------------------------');

  const localSql = postgres(buildConnectionUrl(localConfig), { max: 1 });
  const remoteSql = postgres(buildConnectionUrl(remoteConfig), { max: 1 });

  try {
    // 1. Dynamic physical table inventory from information_schema
    const [localTablesRaw, remoteTablesRaw] = await Promise.all([
      localSql<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `,
      remoteSql<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `,
    ]);

    const localTableSet = new Set(localTablesRaw.map((r) => r.table_name));
    const remoteTableSet = new Set(remoteTablesRaw.map((r) => r.table_name));

    const ddlTables = getExpectedTablesFromSchema();

    // Include the baseline and live tables from both databases.
    const allTables = Array.from(
      new Set([...ddlTables, ...localTableSet, ...remoteTableSet])
    ).sort();

    const summaries: TableSummary[] = [];
    const missingItemsReport: string[] = [];
    let hasDrift = false;

    for (const table of allTables) {
      const existsLocally = localTableSet.has(table);
      const existsRemotely = remoteTableSet.has(table);

      let localCount: number | string = 'NONEXISTENT';
      let remoteCount: number | string = 'NONEXISTENT';

      if (existsLocally) {
        try {
          const [lRes] = await localSql.unsafe(`SELECT count(*)::int AS count FROM "${table}"`);
          localCount = lRes?.count ?? 0;
        } catch {
          localCount = 'ERROR';
        }
      }

      if (existsRemotely) {
        try {
          const [rRes] = await remoteSql.unsafe(`SELECT count(*)::int AS count FROM "${table}"`);
          remoteCount = rRes?.count ?? 0;
        } catch {
          remoteCount = 'ERROR';
        }
      }

      let status: 'COHERENT' | 'DRIFT' | 'MISSING_IN_REMOTE' | 'MISSING_IN_DEV' = 'COHERENT';
      let diffDisplay: number | string = 0;

      if (existsLocally && !existsRemotely) {
        status = 'MISSING_IN_REMOTE';
        diffDisplay = 'N/A';
        hasDrift = true;
        missingItemsReport.push(`[SCHEMA DDL] Table "${table}" exists in Dev but is MISSING in Remote database.`);
      } else if (!existsLocally && existsRemotely) {
        status = 'MISSING_IN_DEV';
        diffDisplay = 'N/A';
        hasDrift = true;
        missingItemsReport.push(`[SCHEMA DDL] Table "${table}" exists in Remote but does not exist in Dev.`);
      } else if (existsLocally && existsRemotely) {
        const lNum = typeof localCount === 'number' ? localCount : -1;
        const rNum = typeof remoteCount === 'number' ? remoteCount : -2;
        const diff = Math.abs(lNum - rNum);
        diffDisplay = diff;
        if (diff !== 0) {
          status = 'DRIFT';
          hasDrift = true;
        } else {
          status = 'COHERENT';
        }
      }

      summaries.push({
        table,
        localCount,
        remoteCount,
        diffCount: diffDisplay,
        status,
      });
    }

    // 2. Catalog analysis: sys_applications
    if (localTableSet.has('sys_applications') && remoteTableSet.has('sys_applications')) {
      try {
        interface AppRow { code: string; app_name: string; app_version: string }
        const localApps = await localSql<AppRow[]>`SELECT code, app_name, app_version FROM sys_applications WHERE deleted_at IS NULL`;
        const remoteApps = await remoteSql<AppRow[]>`SELECT code, app_name, app_version FROM sys_applications WHERE deleted_at IS NULL`;
        const remoteAppMap = new Map(remoteApps.map((a) => [a.code, a]));

        for (const la of localApps) {
          const ra = remoteAppMap.get(la.code);
          if (!ra) {
            hasDrift = true;
            missingItemsReport.push(`[sys_applications] Application "${la.code}" (${la.app_name}) exists in Dev but missing in Remote`);
          } else if (la.app_version !== ra.app_version) {
            hasDrift = true;
            missingItemsReport.push(`[sys_applications] Version drift in "${la.code}": Dev="${la.app_version}" vs Remote="${ra.app_version}"`);
          }
        }
      } catch {
        // Schema variance fallback
      }
    }

    // 3. Resource analysis: sys_application_resources
    if (localTableSet.has('sys_application_resources') && remoteTableSet.has('sys_application_resources')) {
      try {
        interface ResRow { item_code: string; resource_type: string; label_key: string | null; min_role: string; route: string | null }
        const localResources = await localSql<ResRow[]>`SELECT item_code, resource_type, label_key, min_role, route FROM sys_application_resources WHERE deleted_at IS NULL`;
        const remoteResources = await remoteSql<ResRow[]>`SELECT item_code, resource_type, label_key, min_role, route FROM sys_application_resources WHERE deleted_at IS NULL`;
        const remoteResMap = new Map(remoteResources.map((r) => [r.item_code, r]));

        for (const lr of localResources) {
          const rr = remoteResMap.get(lr.item_code);
          if (!rr) {
            hasDrift = true;
            missingItemsReport.push(`[sys_application_resources] Resource "${lr.item_code}" (${lr.label_key ?? lr.resource_type}) missing in Remote`);
          } else if (lr.route !== rr.route || lr.min_role !== rr.min_role) {
            hasDrift = true;
            missingItemsReport.push(`[sys_application_resources] Resource "${lr.item_code}" route/role drift: Dev=[${lr.min_role}] ${lr.route ?? ''} vs Remote=[${rr.min_role}] ${rr.route ?? ''}`);
          }
        }
      } catch {
        // Fallback
      }
    }

    // 4. Tenant analysis: sys_tenants
    if (localTableSet.has('sys_tenants') && remoteTableSet.has('sys_tenants')) {
      try {
        interface TenantRow { slug: string; name: string }
        const localTenants = await localSql<TenantRow[]>`SELECT slug, name FROM sys_tenants WHERE deleted_at IS NULL`;
        const remoteTenants = await remoteSql<TenantRow[]>`SELECT slug, name FROM sys_tenants WHERE deleted_at IS NULL`;
        const remoteTenantSlugs = new Set(remoteTenants.map((t) => t.slug));

        for (const lt of localTenants) {
          if (!remoteTenantSlugs.has(lt.slug)) {
            hasDrift = true;
            missingItemsReport.push(`[sys_tenants] Tenant "${lt.slug}" (${lt.name}) missing in Remote`);
          }
        }
      } catch {
        // Fallback
      }
    }

    // 5. Group analysis: iam_groups
    if (localTableSet.has('iam_groups') && remoteTableSet.has('iam_groups')) {
      try {
        interface GroupRow { name: string }
        const localGroups = await localSql<GroupRow[]>`SELECT name FROM iam_groups WHERE deleted_at IS NULL`;
        const remoteGroups = await remoteSql<GroupRow[]>`SELECT name FROM iam_groups WHERE deleted_at IS NULL`;
        const remoteGroupNames = new Set(remoteGroups.map((g) => g.name));

        for (const lg of localGroups) {
          if (!remoteGroupNames.has(lg.name)) {
            hasDrift = true;
            missingItemsReport.push(`[iam_groups] Group "${lg.name}" missing in Remote`);
          }
        }
      } catch {
        // Fallback
      }
    }

    // 6. User analysis: iam_users
    if (localTableSet.has('iam_users') && remoteTableSet.has('iam_users')) {
      try {
        interface UserRow { username: string; role: UserRole }
        const localUsers = await localSql<UserRow[]>`SELECT username, role FROM iam_users WHERE deleted_at IS NULL`;
        const remoteUsers = await remoteSql<UserRow[]>`SELECT username, role FROM iam_users WHERE deleted_at IS NULL`;
        const remoteUserMap = new Map(remoteUsers.map((u) => [u.username, u.role]));

        for (const lu of localUsers) {
          if (!remoteUserMap.has(lu.username)) {
            hasDrift = true;
            missingItemsReport.push(`[iam_users] User "${lu.username}" (${lu.role}) missing in Remote`);
          } else if (remoteUserMap.get(lu.username) !== lu.role) {
            hasDrift = true;
            missingItemsReport.push(`[iam_users] Role for "${lu.username}" diverges: Dev=${lu.role} vs Remote=${remoteUserMap.get(lu.username)}`);
          }
        }
      } catch {
        // Fallback
      }
    }

    // Audit Table Display
    console.log('\n=== AUDIT REPORT: DEVELOPMENT vs REMOTE ===\n');
    console.log(
      'Table'.padEnd(30) +
      'Dev (Local)'.padEnd(16) +
      'Remote (Target)'.padEnd(18) +
      'Difference'.padEnd(14) +
      'Status'
    );
    console.log('-'.repeat(95));

    for (const s of summaries) {
      let statusText = '✅ COHERENT';
      if (s.status === 'MISSING_IN_REMOTE') {
        statusText = '❌ MISSING IN REMOTE';
      } else if (s.status === 'MISSING_IN_DEV') {
        statusText = '⚠️  MISSING IN DEV';
      } else if (s.status === 'DRIFT') {
        statusText = '⚠️  DRIFT';
      }

      console.log(
        s.table.padEnd(30) +
        String(s.localCount).padEnd(16) +
        String(s.remoteCount).padEnd(18) +
        String(s.diffCount).padEnd(14) +
        statusText
      );
    }
    console.log('-'.repeat(95));

    if (missingItemsReport.length > 0) {
      console.log('\n[DETECTED DRIFT DETAILS]:');
      for (const item of missingItemsReport) {
        console.log(`  • ${item}`);
      }
    } else if (!hasDrift) {
      console.log('\n✅ Perfect! All audited tables and records are coherent between Dev and Remote.');
    }

    return hasDrift;
  } finally {
    await localSql.end();
    await remoteSql.end();
  }
}

/**
 * Formats the elapsed time shown in the read-only activity report.
 */
function formatElapsedTime(minutes: number | null): string {
  if (minutes === null) return 'N/A';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remMinutes}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Queries active PostgreSQL connections, iam_sessions and latest activity on remote database
 */
async function getRemoteActivity(remoteConfig: PgConnectionConfig): Promise<{
  activeUsers: ActiveUserInfo[];
  totalActiveSessions: number;
  onlineCount: number;
  idleCount: number;
  inactiveCount: number;
  dbConnections: number;
  recentAuditLogs: { username: string; action: string; resource: string; createdAt: Date }[];
}> {
  const remoteSql = postgres(buildConnectionUrl(remoteConfig), { max: 1 });
  try {
    let dbConnections = 0;
    try {
      const [connRes] = await remoteSql.unsafe<{ count: number }[]>(`
        SELECT count(*)::int AS count 
        FROM pg_stat_activity 
        WHERE datname = ${remoteSql(remoteConfig.database)} AND pid != pg_backend_pid()
      `);
      dbConnections = connRes?.count ?? 0;
    } catch {
      // Role may lack permissions for global stats
    }

    // 1. Map latest activity in sys_audit_logs per user
    const lastAuditMap = new Map<string, Date>();
    try {
      const auditRows = await remoteSql<{ username: string; max_date: Date }[]>`
        SELECT username, MAX(created_at) AS max_date
        FROM sys_audit_logs
        GROUP BY username
      `;
      for (const r of auditRows) {
        if (r.username && r.max_date) {
          lastAuditMap.set(r.username, new Date(r.max_date));
        }
      }
    } catch {
      // sys_audit_logs might not exist yet
    }

    // 2. Query active sessions (expires_at > NOW() AND revoked_at IS NULL)
    let totalActiveSessions = 0;
    const userGroups = new Map<string, {
      username: string;
      fullName: string;
      email: string;
      role: UserRole;
      latestIp: string | null;
      activeSessionCount: number;
      lastLoginAt: Date;
      userLastAccess: Date | null;
    }>();

    try {
      const sessionRows = await remoteSql<{
        username: string;
        full_name: string;
        email: string;
        role: UserRole;
        last_access: Date | null;
        ip_address: string | null;
        user_agent: string | null;
        session_created_at: Date;
        expires_at: Date;
      }[]>`
        SELECT 
          u.username,
          u.full_name,
          u.email,
          u.role,
          u.last_access,
          s.ip_address,
          s.user_agent,
          s.created_at AS session_created_at,
          s.expires_at
        FROM iam_sessions s
        JOIN iam_users u ON s.user_id = u.id
        WHERE s.expires_at > NOW() AND s.revoked_at IS NULL
        ORDER BY s.created_at DESC
      `;

      totalActiveSessions = sessionRows.length;

      for (const row of sessionRows) {
        const existing = userGroups.get(row.username);
        const sessionDate = new Date(row.session_created_at);

        if (!existing) {
          userGroups.set(row.username, {
            username: row.username,
            fullName: row.full_name,
            email: row.email,
            role: row.role,
            latestIp: row.ip_address,
            activeSessionCount: 1,
            lastLoginAt: sessionDate,
            userLastAccess: row.last_access ? new Date(row.last_access) : null,
          });
        } else {
          existing.activeSessionCount += 1;
          if (sessionDate > existing.lastLoginAt) {
            existing.lastLoginAt = sessionDate;
            existing.latestIp = row.ip_address;
          }
        }
      }
    } catch {
      // iam_sessions might not exist yet
    }

    // 3. Process each user to determine true latest activity and presence
    const now = Date.now();
    const activeUsers: ActiveUserInfo[] = [];
    let onlineCount = 0;
    let idleCount = 0;
    let inactiveCount = 0;

    for (const group of userGroups.values()) {
      const candidateDates: number[] = [group.lastLoginAt.getTime()];
      if (group.userLastAccess) {
        candidateDates.push(group.userLastAccess.getTime());
      }
      const auditDate = lastAuditMap.get(group.username);
      if (auditDate) {
        candidateDates.push(auditDate.getTime());
      }

      const maxActivityTs = Math.max(...candidateDates);
      const lastActivityAt = new Date(maxActivityTs);
      const minutesSinceLastActivity = Math.max(0, Math.floor((now - maxActivityTs) / 60000));

      let presence: UserPresenceStatus = UserPresenceStatus.INACTIVE;
      if (minutesSinceLastActivity <= 15) {
        presence = UserPresenceStatus.ONLINE;
        onlineCount += 1;
      } else if (minutesSinceLastActivity <= 60) {
        presence = UserPresenceStatus.IDLE_RECENT;
        idleCount += 1;
      } else {
        presence = UserPresenceStatus.INACTIVE;
        inactiveCount += 1;
      }

      activeUsers.push({
        username: group.username,
        fullName: group.fullName,
        email: group.email,
        role: group.role,
        latestIp: group.latestIp,
        activeSessionCount: group.activeSessionCount,
        lastLoginAt: group.lastLoginAt,
        lastActivityAt,
        minutesSinceLastActivity,
        presence,
      });
    }

    // Sort: ONLINE first, then IDLE_RECENT, then INACTIVE
    activeUsers.sort((a, b) => {
      const order: Record<UserPresenceStatus, number> = {
        [UserPresenceStatus.ONLINE]: 0,
        [UserPresenceStatus.IDLE_RECENT]: 1,
        [UserPresenceStatus.INACTIVE]: 2,
      };
      if (order[a.presence] !== order[b.presence]) {
        return order[a.presence] - order[b.presence];
      }
      return (a.minutesSinceLastActivity ?? 999999) - (b.minutesSinceLastActivity ?? 999999);
    });

    // 4. Last 5 general audit actions
    const recentAuditLogs: { username: string; action: string; resource: string; createdAt: Date }[] = [];
    try {
      const logs = await remoteSql<{
        username: string;
        action: string;
        resource: string;
        created_at: Date;
      }[]>`
        SELECT username, action, resource, created_at
        FROM sys_audit_logs
        WHERE created_at > NOW() - INTERVAL '30 minutes'
        ORDER BY created_at DESC
        LIMIT 5
      `;
      for (const l of logs) {
        recentAuditLogs.push({
          username: l.username || 'Unknown',
          action: l.action,
          resource: l.resource,
          createdAt: l.created_at,
        });
      }
    } catch {
      // Fallback
    }

    return {
      activeUsers,
      totalActiveSessions,
      onlineCount,
      idleCount,
      inactiveCount,
      dbConnections,
      recentAuditLogs,
    };
  } finally {
    await remoteSql.end();
  }
}

/**
 * Displays full report of users and active sessions on remote server
 */
async function displayRemoteUsersReport(remoteConfig: PgConnectionConfig): Promise<void> {
  console.log('\n============================================================');
  console.log('  👥 REAL-TIME USERS AND ACTIVITY ON REMOTE SERVER           ');
  console.log(`  Server: ${remoteConfig.host} | Database: ${remoteConfig.database}`);
  console.log('============================================================\n');

  const activity = await getRemoteActivity(remoteConfig);

  console.log('Operational Summary:');
  console.log(`  • Active PostgreSQL connections: ${activity.dbConnections} connection(s)`);
  console.log(`  • Total active sessions in database: ${activity.totalActiveSessions} (default 7-day persistence)`);
  console.log(`  • Unique users with active sessions: ${activity.activeUsers.length} user(s)\n`);

  console.log('Real-Time Presence Status:');
  console.log(`  🟢 Online Now (activity in last 15 min): ${activity.onlineCount} user(s)`);
  console.log(`  🟡 Idle Recent (activity between 15 and 60 min): ${activity.idleCount} user(s)`);
  console.log(`  ⚪ Away / Closed Tab (no activity for > 1h): ${activity.inactiveCount} user(s)\n`);

  if (activity.activeUsers.length > 0) {
    console.log(
      'Username'.padEnd(16) +
      'Full Name'.padEnd(24) +
      'Role'.padEnd(12) +
      'Sessions'.padEnd(10) +
      'Last Login'.padEnd(20) +
      'Last Activity'.padEnd(20) +
      'Presence'
    );
    console.log('-'.repeat(115));

    for (const u of activity.activeUsers) {
      const loginStr = u.lastLoginAt
        ? new Date(u.lastLoginAt).toISOString().replace('T', ' ').slice(0, 16)
        : 'N/A';
      const elapsedStr = formatElapsedTime(u.minutesSinceLastActivity);

      let statusBadge = '⚪ Away (>1h)';
      if (u.presence === UserPresenceStatus.ONLINE) {
        statusBadge = '🟢 ONLINE NOW';
      } else if (u.presence === UserPresenceStatus.IDLE_RECENT) {
        statusBadge = '🟡 Idle Recent';
      }

      console.log(
        u.username.padEnd(16) +
        u.fullName.slice(0, 22).padEnd(24) +
        u.role.padEnd(12) +
        String(u.activeSessionCount).padEnd(10) +
        loginStr.padEnd(20) +
        elapsedStr.padEnd(20) +
        statusBadge
      );
    }
    console.log('-'.repeat(115));
  } else {
    console.log('✅ No active sessions found on the remote database.');
    console.log('   The remote database is free for maintenance operations.');
  }

  if (activity.recentAuditLogs.length > 0) {
    console.log('\nRecent actions recorded in the last 30 minutes (sys_audit_logs):');
    for (const log of activity.recentAuditLogs) {
      const timeStr = new Date(log.createdAt).toISOString().replace('T', ' ').slice(11, 19);
      console.log(`  • [${timeStr}] ${log.username}: ${log.action} on ${log.resource}`);
    }
  } else {
    console.log('\nNo actions recorded in the last 30 minutes (sys_audit_logs).');
  }
}

/**
 * Main db:sync-remote entrypoint
 */
export async function dbSyncRemote(options: DbSyncRemoteOptions = {}): Promise<void> {
  if (options.mode && !Object.values(DbSyncRemoteMode).includes(options.mode)) {
    throw new Error(`Supported modes: ${Object.values(DbSyncRemoteMode).join(', ')}. Reset was removed; use a reviewed maintenance clone.`);
  }
  const remoteConfig = await promptRemoteConfig(options.remoteHost);
  const identity = remoteConfig.host + ':' + remoteConfig.port + '/' + remoteConfig.database;
  const remoteConnection = await testPgConnection(remoteConfig);
  if (!remoteConnection.success) throw new Error('Remote connection failed: ' + remoteConnection.error);
  let mode = options.mode;
  if (!mode) {
    const answer = await inquirer.prompt<{ mode: DbSyncRemoteMode }>([{
      type: 'list',
      name: 'mode',
      message: 'Remote operation mode:',
      default: DbSyncRemoteMode.AUDIT,
      choices: [
        { name: 'Read-only drift audit', value: DbSyncRemoteMode.AUDIT },
        { name: 'Users and real-time activity', value: DbSyncRemoteMode.USERS },
        { name: 'Exceptional maintenance clone', value: DbSyncRemoteMode.CLONE },
      ],
    }]);
    mode = answer.mode;
  }
  if (mode === DbSyncRemoteMode.USERS) {
    await displayRemoteUsersReport(remoteConfig);
    return;
  }
  const localConfig = resolveLocalConfig();
  if (mode === DbSyncRemoteMode.AUDIT) {
    const localConnection = await testPgConnection(localConfig);
    if (!localConnection.success) throw new Error('Local connection failed.');
    await runDriftAudit(localConfig, remoteConfig);
    console.log('Read-only data comparison completed. Different row counts are expected while testers use the remote database. Use db:status for versions.');
    return;
  }
  if (!options.maintenance || options.confirmTarget !== identity) {
    throw new Error('Pause API/workers and confirm replacement with --maintenance --confirm-target ' + identity + '. --force does not bypass this requirement.');
  }
  if (!options.force) {
    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([{
      type: 'confirm',
      name: 'confirmed',
      default: false,
      message: 'Replace remote data with local database snapshot, keeping backups and previous database for recovery?',
    }]);
    if (!confirmed) return;
  }
  await cloneVersionedDatabase(localConfig, remoteConfig);
}

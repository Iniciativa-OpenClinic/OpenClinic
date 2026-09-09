import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { testPgConnection, PgConnectionConfig } from '../utils/pg-runner.js';
import { cloneVersionedDatabase } from '../utils/database-clone.js';
import { databaseDirectory } from '../utils/migration-runner.js';
import { resolveDatabaseTarget } from '../utils/database-target.js';

export interface DbSyncRemoteOptions {
  mode?: 'audit' | 'clone' | 'users';
  remoteHost?: string;
  force?: boolean;
  maintenance?: boolean;
  confirmTarget?: string;
}

export type UserPresenceStatus = 'ONLINE' | 'IDLE_RECENT' | 'INACTIVE';

export interface ActiveUserInfo {
  username: string;
  fullName: string;
  email: string;
  role: string;
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
  role: string;
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
  status: 'COERENTE' | 'DIVERGENTE' | 'FALTA NO REMOTO' | 'FALTA NO DEV';
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
  return { host: parsed.hostname, port: Number(parsed.port || 5432), database: decodeURIComponent(parsed.pathname.slice(1)),
    user: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password), connectionUrl: url };
}

/**
 * Builds PostgreSQL connection URL string from config
 */
function buildConnectionUrl(config: PgConnectionConfig): string {
  return config.connectionUrl ?? `postgresql://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password || '')}@${config.host}:${config.port}/${config.database}`;
}

/**
 * Prompt remote connection settings
 */
async function promptRemoteConfig(defaultHost?: string): Promise<PgConnectionConfig> {
  if (process.env['REMOTE_DATABASE_OWNER_URL'] && !defaultHost) {
    const connectionUrl = process.env['REMOTE_DATABASE_OWNER_URL'];
    const url = new URL(connectionUrl);
    return { host: url.hostname, port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1)),
      user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), connectionUrl };
  }
  const envRemoteUrl = process.env['DATABASE_REMOTE_URL'];
  let parsedRemote: Partial<PgConnectionConfig> = {};
  if (envRemoteUrl) {
    try {
      const p = new URL(envRemoteUrl);
      parsedRemote = {
        host: p.hostname,
        port: p.port ? parseInt(p.port, 10) : 5432,
        database: p.pathname.replace(/^\//, '') || 'openclinic',
        user: decodeURIComponent(p.username || 'openclinic_owner'),
        password: decodeURIComponent(p.password || 'temp1234'),
      };
    } catch {
      // Keep defaults
    }
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'host',
      message: 'Host / IP do servidor remoto de testes:',
      default: defaultHost || parsedRemote.host,
      validate: (v: string) => v.trim().length > 0 || 'Host é obrigatório.',
    },
    {
      type: 'input',
      name: 'port',
      message: 'Porta do PostgreSQL remoto:',
      default: String(parsedRemote.port || 5432),
      validate: (v: string) => !isNaN(parseInt(v, 10)) || 'Porta inválida.',
    },
    {
      type: 'input',
      name: 'database',
      message: 'Nome do banco de dados remoto:',
      default: parsedRemote.database || 'openclinic',
    },
    {
      type: 'input',
      name: 'user',
      message: 'Usuário remoto (owner com permissões DDL):',
      default: parsedRemote.user || 'openclinic_owner',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Senha do usuário remoto:',
      default: parsedRemote.password || 'temp1234',
      mask: '*',
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
  console.log('  [1/3] Iniciando Auditoria de Coerência (Dev vs Remoto)    ');
  console.log('------------------------------------------------------------');

  const localSql = postgres(buildConnectionUrl(localConfig), { max: 1 });
  const remoteSql = postgres(buildConnectionUrl(remoteConfig), { max: 1 });

  try {
    // 1. Consulta dinâmica das tabelas físicas existentes em ambos os bancos
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

      let localCount: number | string = 'INEXISTENTE';
      let remoteCount: number | string = 'INEXISTENTE';

      if (existsLocally) {
        try {
          const [lRes] = await localSql.unsafe(`SELECT count(*)::int AS count FROM "${table}"`);
          localCount = lRes?.count ?? 0;
        } catch {
          localCount = 'ERRO';
        }
      }

      if (existsRemotely) {
        try {
          const [rRes] = await remoteSql.unsafe(`SELECT count(*)::int AS count FROM "${table}"`);
          remoteCount = rRes?.count ?? 0;
        } catch {
          remoteCount = 'ERRO';
        }
      }

      let status: 'COERENTE' | 'DIVERGENTE' | 'FALTA NO REMOTO' | 'FALTA NO DEV' = 'COERENTE';
      let diffDisplay: number | string = 0;

      if (existsLocally && !existsRemotely) {
        status = 'FALTA NO REMOTO';
        diffDisplay = 'N/A';
        hasDrift = true;
        missingItemsReport.push(`[SCHEMA DDL] Tabela "${table}" existe em Dev mas NÃO EXISTE no banco Remoto.`);
      } else if (!existsLocally && existsRemotely) {
        status = 'FALTA NO DEV';
        diffDisplay = 'N/A';
        hasDrift = true;
        missingItemsReport.push(`[SCHEMA DDL] Tabela "${table}" existe no Remoto mas não existe em Dev.`);
      } else if (existsLocally && existsRemotely) {
        const lNum = typeof localCount === 'number' ? localCount : -1;
        const rNum = typeof remoteCount === 'number' ? remoteCount : -2;
        const diff = Math.abs(lNum - rNum);
        diffDisplay = diff;
        if (diff !== 0) {
          status = 'DIVERGENTE';
          hasDrift = true;
        } else {
          status = 'COERENTE';
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

    // 2. Análise aprofundada de registros de catálogo: sys_applications
    if (localTableSet.has('sys_applications') && remoteTableSet.has('sys_applications')) {
      try {
        const localApps = await localSql`SELECT code, app_name, app_version FROM sys_applications WHERE deleted_at IS NULL`;
        const remoteApps = await remoteSql`SELECT code, app_name, app_version FROM sys_applications WHERE deleted_at IS NULL`;
        const remoteAppMap = new Map(remoteApps.map((a: any) => [a.code, a]));

        for (const la of localApps) {
          const ra = remoteAppMap.get(la.code);
          if (!ra) {
            hasDrift = true;
            missingItemsReport.push(`[sys_applications] Aplicação "${la.code}" (${la.app_name}) existe em Dev mas falta no Remoto`);
          } else if (la.app_version !== ra.app_version) {
            hasDrift = true;
            missingItemsReport.push(`[sys_applications] Versão divergente em "${la.code}": Dev="${la.app_version}" vs Remoto="${ra.app_version}"`);
          }
        }
      } catch {
        // Ignora caso schema difira
      }
    }

    // 3. Análise aprofundada de recursos: sys_application_resources
    if (localTableSet.has('sys_application_resources') && remoteTableSet.has('sys_application_resources')) {
      try {
        const localResources = await localSql`SELECT item_code, resource_type, label_key, min_role, route FROM sys_application_resources WHERE deleted_at IS NULL`;
        const remoteResources = await remoteSql`SELECT item_code, resource_type, label_key, min_role, route FROM sys_application_resources WHERE deleted_at IS NULL`;
        const remoteResMap = new Map(remoteResources.map((r: any) => [r.item_code, r]));

        for (const lr of localResources) {
          const rr = remoteResMap.get(lr.item_code);
          if (!rr) {
            hasDrift = true;
            missingItemsReport.push(`[sys_application_resources] Recurso "${lr.item_code}" (${lr.label_key ?? lr.resource_type}) falta no Remoto`);
          } else if (lr.route !== rr.route || lr.min_role !== rr.min_role) {
            hasDrift = true;
            missingItemsReport.push(`[sys_application_resources] Recurso "${lr.item_code}" com divergência de rota/role: Dev=[${lr.min_role}] ${lr.route ?? ''} vs Remoto=[${rr.min_role}] ${rr.route ?? ''}`);
          }
        }
      } catch {
        // Ignora
      }
    }

    // 4. Análise aprofundada de tenants: sys_tenants
    if (localTableSet.has('sys_tenants') && remoteTableSet.has('sys_tenants')) {
      try {
        const localTenants = await localSql`SELECT slug, name FROM sys_tenants WHERE deleted_at IS NULL`;
        const remoteTenants = await remoteSql`SELECT slug, name FROM sys_tenants WHERE deleted_at IS NULL`;
        const remoteTenantSlugs = new Set(remoteTenants.map((t: any) => t.slug));

        for (const lt of localTenants) {
          if (!remoteTenantSlugs.has(lt.slug)) {
            hasDrift = true;
            missingItemsReport.push(`[sys_tenants] Tenant "${lt.slug}" (${lt.name}) falta no Remoto`);
          }
        }
      } catch {
        // Ignora
      }
    }

    // 5. Análise aprofundada de grupos: iam_groups
    if (localTableSet.has('iam_groups') && remoteTableSet.has('iam_groups')) {
      try {
        const localGroups = await localSql`SELECT name FROM iam_groups WHERE deleted_at IS NULL`;
        const remoteGroups = await remoteSql`SELECT name FROM iam_groups WHERE deleted_at IS NULL`;
        const remoteGroupNames = new Set(remoteGroups.map((g: any) => g.name));

        for (const lg of localGroups) {
          if (!remoteGroupNames.has(lg.name)) {
            hasDrift = true;
            missingItemsReport.push(`[iam_groups] Grupo "${lg.name}" falta no Remoto`);
          }
        }
      } catch {
        // Ignora
      }
    }

    // 6. Análise aprofundada de usuários: iam_users
    if (localTableSet.has('iam_users') && remoteTableSet.has('iam_users')) {
      try {
        const localUsers = await localSql`SELECT username, role FROM iam_users WHERE deleted_at IS NULL`;
        const remoteUsers = await remoteSql`SELECT username, role FROM iam_users WHERE deleted_at IS NULL`;
        const remoteUserMap = new Map(remoteUsers.map((u: any) => [u.username, u.role]));

        for (const lu of localUsers) {
          if (!remoteUserMap.has(lu.username)) {
            hasDrift = true;
            missingItemsReport.push(`[iam_users] Usuário "${lu.username}" (${lu.role}) falta no Remoto`);
          } else if (remoteUserMap.get(lu.username) !== lu.role) {
            hasDrift = true;
            missingItemsReport.push(`[iam_users] Role de "${lu.username}" diverge: Dev=${lu.role} vs Remoto=${remoteUserMap.get(lu.username)}`);
          }
        }
      } catch {
        // Ignora
      }
    }

    // Exibição da Tabela de Auditoria
    console.log('\n=== RELATÓRIO DE AUDITORIA: DESENVOLVIMENTO vs REMOTO ===\n');
    console.log(
      'Tabela'.padEnd(30) +
      'Dev (Local)'.padEnd(16) +
      'Remoto (Testes)'.padEnd(18) +
      'Diferença'.padEnd(14) +
      'Status'
    );
    console.log('-'.repeat(95));

    for (const s of summaries) {
      let statusText = '✅ COERENTE';
      if (s.status === 'FALTA NO REMOTO') {
        statusText = '❌ FALTA NO REMOTO';
      } else if (s.status === 'FALTA NO DEV') {
        statusText = '⚠️  FALTA NO DEV';
      } else if (s.status === 'DIVERGENTE') {
        statusText = '⚠️  DIVERGENTE';
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
      console.log('\n[DETALHAMENTO DAS DIVERGÊNCIAS DETECTADAS]:');
      for (const item of missingItemsReport) {
        console.log(`  • ${item}`);
      }
    } else if (!hasDrift) {
      console.log('\n✅ Perfeito! Todos os registros e tabelas auditados estão coerentes entre Dev e Remoto.');
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
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remMinutes}m atrás`;
  const days = Math.floor(hours / 24);
  return `${days} dia(s) atrás`;
}

/**
 * Consulta conexões ativas no PostgreSQL, sessões em iam_sessions e última atividade no banco remoto
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
      // Role pode não ter permissão para ler estatísticas globais
    }

    // 1. Obter mapa de última atividade no sys_audit_logs por usuário
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
      // sys_audit_logs pode não existir
    }

    // 2. Obter sessões ativas (expires_at > NOW() AND revoked_at IS NULL)
    let totalActiveSessions = 0;
    const userGroups = new Map<string, {
      username: string;
      fullName: string;
      email: string;
      role: string;
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
        role: string;
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
      // Tabela iam_sessions pode não existir ainda
    }

    // 3. Processar cada usuário único para definir última atividade real e presença
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

      let presence: UserPresenceStatus = 'INACTIVE';
      if (minutesSinceLastActivity <= 15) {
        presence = 'ONLINE';
        onlineCount += 1;
      } else if (minutesSinceLastActivity <= 60) {
        presence = 'IDLE_RECENT';
        idleCount += 1;
      } else {
        presence = 'INACTIVE';
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

    // Ordenar: ONLINE primeiro, depois IDLE_RECENT, depois INACTIVE (e por mais recente)
    activeUsers.sort((a, b) => {
      const order: Record<UserPresenceStatus, number> = { ONLINE: 0, IDLE_RECENT: 1, INACTIVE: 2 };
      if (order[a.presence] !== order[b.presence]) {
        return order[a.presence] - order[b.presence];
      }
      return (a.minutesSinceLastActivity ?? 999999) - (b.minutesSinceLastActivity ?? 999999);
    });

    // 4. Últimas 5 ações de auditoria geral
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
          username: l.username || 'Desconhecido',
          action: l.action,
          resource: l.resource,
          createdAt: l.created_at,
        });
      }
    } catch {
      // Ignora
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
 * Exibe relatório completo de usuários e sessões ativas no servidor remoto
 */
async function displayRemoteUsersReport(remoteConfig: PgConnectionConfig): Promise<void> {
  console.log('\n============================================================');
  console.log('  👥 USUÁRIOS E ATIVIDADE EM TEMPO REAL NO SERVIDOR REMOTO   ');
  console.log(`  Servidor: ${remoteConfig.host} | Base: ${remoteConfig.database}`);
  console.log('============================================================\n');

  const activity = await getRemoteActivity(remoteConfig);

  console.log('Resumo Operacional:');
  console.log(`  • Conexões ativas no PostgreSQL: ${activity.dbConnections} conexão(ões)`);
  console.log(`  • Total de sessões abertas no banco: ${activity.totalActiveSessions} (persistência padrão de 7 dias)`);
  console.log(`  • Usuários únicos com sessão aberta: ${activity.activeUsers.length} usuário(s)\n`);

  console.log('Status de Presença em Tempo Real:');
  console.log(`  🟢 Online Agora (ação nos últimos 15 min): ${activity.onlineCount} usuário(s)`);
  console.log(`  🟡 Inativo Recente (ação entre 15 e 60 min): ${activity.idleCount} usuário(s)`);
  console.log(`  ⚪ Ausente / Aba Fechada (sem ações há mais de 1h): ${activity.inactiveCount} usuário(s)\n`);

  if (activity.activeUsers.length > 0) {
    console.log(
      'Username'.padEnd(16) +
      'Nome Completo'.padEnd(24) +
      'Role'.padEnd(12) +
      'Sessões'.padEnd(9) +
      'Último Login'.padEnd(16) +
      'Última Atividade'.padEnd(20) +
      'Presença'
    );
    console.log('-'.repeat(115));

    for (const u of activity.activeUsers) {
      const loginStr = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('pt-BR') + ' ' + new Date(u.lastLoginAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      const elapsedStr = formatElapsedTime(u.minutesSinceLastActivity);

      let statusBadge = '⚪ Ausente (>1h)';
      if (u.presence === 'ONLINE') {
        statusBadge = '🟢 ONLINE AGORA';
      } else if (u.presence === 'IDLE_RECENT') {
        statusBadge = '🟡 Inativo Recente';
      }

      console.log(
        u.username.padEnd(16) +
        u.fullName.slice(0, 22).padEnd(24) +
        u.role.padEnd(12) +
        String(u.activeSessionCount).padEnd(9) +
        loginStr.padEnd(16) +
        elapsedStr.padEnd(20) +
        statusBadge
      );
    }
    console.log('-'.repeat(115));
  } else {
    console.log('✅ Nenhuma sessão encontrada no banco remoto.');
    console.log('   O banco remoto está 100% livre para manutenção.');
  }

  if (activity.recentAuditLogs.length > 0) {
    console.log('\nÚltimas ações registradas nos últimos 30 minutos (sys_audit_logs):');
    for (const log of activity.recentAuditLogs) {
      const timeStr = new Date(log.createdAt).toLocaleTimeString('pt-BR');
      console.log(`  • [${timeStr}] ${log.username}: ${log.action} em ${log.resource}`);
    }
  } else {
    console.log('\nNenhuma ação registrada nos últimos 30 minutos (sys_audit_logs).');
  }
}

/**
 * Main db:sync-remote entrypoint
 */
export async function dbSyncRemote(options: DbSyncRemoteOptions = {}): Promise<void> {
  if (options.mode && !['users', 'audit', 'clone'].includes(options.mode)) {
    throw new Error('Supported modes: users, audit, clone. Reset was removed; use a reviewed maintenance clone.');
  }
  const remoteConfig = await promptRemoteConfig(options.remoteHost);
  const identity = remoteConfig.host + ':' + remoteConfig.port + '/' + remoteConfig.database;
  const remoteConnection = await testPgConnection(remoteConfig);
  if (!remoteConnection.success) throw new Error('Remote connection failed: ' + remoteConnection.error);
  let mode = options.mode;
  if (!mode) {
    const answer = await inquirer.prompt<{ mode: 'audit' | 'users' | 'clone' }>([{
      type: 'list', name: 'mode', message: 'Operacao remota:', default: 'audit',
      choices: [{ name: 'Auditoria somente leitura', value: 'audit' }, { name: 'Usuarios e atividade', value: 'users' }, { name: 'Clonagem excepcional em manutencao', value: 'clone' }],
    }]);
    mode = answer.mode;
  }
  if (mode === 'users') { await displayRemoteUsersReport(remoteConfig); return; }
  const localConfig = resolveLocalConfig();
  if (mode === 'audit') {
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
      type: 'confirm', name: 'confirmed', default: false,
      message: 'Substituir os dados remotos pelos locais, mantendo backup e a base anterior para recuperacao?',
    }]);
    if (!confirmed) return;
  }
  await cloneVersionedDatabase(localConfig, remoteConfig);
}

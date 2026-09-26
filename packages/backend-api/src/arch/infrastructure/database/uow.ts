import { PostgresProcedureRepository } from './procedure.repository.js';
import { PostgresUnitRepository } from './unit.repository.js';
import { TenantRepository } from './tenant.repository.js';
import { ResourceRepository } from './resource.repository.js';
import { PermissionRepository } from './permission.repository.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { UserRepository } from './user.repository.js';
import { GroupRepository } from './group.repository.js';
import { SessionRepository } from './session.repository.js';
import { ApplicationRepository } from './application.repository.js';
import type { IAMUnitOfWork, ILockoutRepository, IAuditLogRepository } from '../../domain/repositories.js';
import type { LockoutEntity, AuditLogEntry } from '../../domain/entities.js';
import { iamLockouts, sysAuditLogs } from './drizzle-schema.js';
import { eq } from 'drizzle-orm';
import { PostgresPractitionerRepository } from './practitioner.repository.js';
import { PostgresPatientRepository } from './patient.repository.js';

class LockoutRepository implements ILockoutRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getByIdentifier(identifier: string): Promise<LockoutEntity | null> {
    const [lockout] = await this.db.select().from(iamLockouts).where(eq(iamLockouts.identifier, identifier)).limit(1);
    return (lockout as unknown as LockoutEntity) ?? null;
  }

  async upsert(identifier: string, attemptCount: number, lockedUntil: Date | null): Promise<void> {
    const existing = await this.getByIdentifier(identifier);
    if (existing) {
      await this.db.update(iamLockouts).set({ attempt_count: attemptCount, locked_until: lockedUntil, updated_at: new Date() }).where(eq(iamLockouts.identifier, identifier));
    } else {
      const id = randomUUID();
      await this.db.insert(iamLockouts).values({ id, identifier, attempt_count: attemptCount, locked_until: lockedUntil } as typeof iamLockouts.$inferInsert);
    }
  }

  async reset(identifier: string): Promise<void> {
    await this.db.update(iamLockouts).set({ attempt_count: 0, locked_until: null, updated_at: new Date() }).where(eq(iamLockouts.identifier, identifier));
  }
}

class AuditLogRepository implements IAuditLogRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async create(entry: AuditLogEntry): Promise<void> {
    const id = entry.id || randomUUID();
    await this.db.insert(sysAuditLogs).values({ ...entry, id } as typeof sysAuditLogs.$inferInsert);
  }
}

export class UnitOfWork implements IAMUnitOfWork {
  public readonly tenants: TenantRepository;
  public readonly users: UserRepository;
  public readonly groups: GroupRepository;
  public readonly sessions: SessionRepository;
  public readonly lockouts: LockoutRepository;
  public readonly auditLogs: AuditLogRepository;
  public readonly resources: ResourceRepository;
  public readonly permissions: PermissionRepository;
  public readonly applications: ApplicationRepository;

  constructor(public readonly db: PostgresJsDatabase) {
    this.tenants = new TenantRepository(db);
    this.users = new UserRepository(db);
    this.groups = new GroupRepository(db);
    this.sessions = new SessionRepository(db);
    this.lockouts = new LockoutRepository(db);
    this.auditLogs = new AuditLogRepository(db);
    this.resources = new ResourceRepository(db);
    this.permissions = new PermissionRepository(db);
    this.applications = new ApplicationRepository(db);
  }

  async commit(): Promise<void> {}
  patientsForTenant(tenantId: string): PostgresPatientRepository {
    return new PostgresPatientRepository(this.db, tenantId);
  }
  practitionersForTenant(tenantId: string): PostgresPractitionerRepository {
    return new PostgresPractitionerRepository(this.db, tenantId);
  }
  unitsForTenant(tenantId: string): PostgresUnitRepository {
    return new PostgresUnitRepository(this.db, tenantId);
  }
  proceduresForTenant(tenantId: string): PostgresProcedureRepository {
    return new PostgresProcedureRepository(this.db, tenantId);
  }
  async rollback(): Promise<void> {}
}

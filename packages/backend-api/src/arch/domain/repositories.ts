import type { RepositoryInterface } from '../../shared/domain/repository.interface.js';
import type { UserEntity, SessionEntity, LockoutEntity, AuditLogEntry, GroupEntity, TenantEntity } from './entities.js';
import type { GroupListItemDTO } from './dtos.js';

export interface ITenantRepository extends RepositoryInterface<TenantEntity> {
  getDefaultTenant(): Promise<TenantEntity | null>;
  getBySlug(slug: string): Promise<TenantEntity | null>;
}

export interface IUserRepository extends RepositoryInterface<UserEntity> {
  getByIdentifier(identifier: string): Promise<UserEntity | null>;
  getByEmail(email: string, tenantId?: string): Promise<UserEntity | null>;
}

export interface IGroupRepository extends RepositoryInterface<GroupEntity> {
  findByName(name: string, tenantId?: string): Promise<GroupEntity | null>;
  findAllWithMemberCount(tenantId?: string): Promise<GroupListItemDTO[]>;
  getDefaultGroup(tenantId?: string): Promise<GroupEntity | null>;
  getMembers(groupId: string): Promise<UserEntity[]>;
  getUserGroups(userId: string): Promise<GroupEntity[]>;
  addMember(groupId: string, userId: string): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;
  isMember(groupId: string, userId: string): Promise<boolean>;
}

export interface ISessionRepository {
  create(session: Omit<SessionEntity, 'id' | 'created_at' | 'updated_at'>): Promise<SessionEntity>;
  findByTokenHash(tokenHash: string): Promise<SessionEntity | null>;
  revoke(id: string): Promise<void>;
  revokeAllByUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

export interface ILockoutRepository {
  getByIdentifier(identifier: string): Promise<LockoutEntity | null>;
  upsert(identifier: string, attemptCount: number, lockedUntil: Date | null): Promise<void>;
  reset(identifier: string): Promise<void>;
}

export interface IAuditLogRepository {
  create(entry: AuditLogEntry): Promise<void>;
}

export interface IAMUnitOfWork {
  tenants: ITenantRepository;
  users: IUserRepository;
  groups: IGroupRepository;
  sessions: ISessionRepository;
  lockouts: ILockoutRepository;
  auditLogs: IAuditLogRepository;
  resources: any;
  permissions: any;
  applications: any;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

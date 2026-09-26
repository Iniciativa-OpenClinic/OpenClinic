import type {
  RepositoryInterface,
  UserRole,
  ApplicationContext,
  ResourceAction,
  PermissionEffect,
} from '@openclinic/core';
import type {
  UserEntity,
  SessionEntity,
  LockoutEntity,
  AuditLogEntry,
  GroupEntity,
  TenantEntity,
  ApplicationResourceEntity,
  ResourceTreeNodeEntity,
  ApplicationPermissionEntity,
  PermissionAclTupleEntity,
} from './entities.js';
import type { GroupListItemDTO, MenuItemDTO } from './dtos.js';
import type {
  PlatformApplicationEntity,
  TenantApplicationConfigEntity,
  UpdatePlatformApplicationDto,
  UpdateTenantApplicationConfigDto,
} from './application.dto.js';

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

export type RotateSessionInput = {
  token_hash: string;
  expires_at: Date;
  id?: string;
  user_id?: string;
  user_agent?: string | null;
  ip_address?: string | null;
  revoked_at?: Date | null;
};

export interface ISessionRepository {
  create(session: Omit<SessionEntity, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<SessionEntity>;
  findById(id: string): Promise<SessionEntity | null>;
  findByTokenHash(tokenHash: string): Promise<SessionEntity | null>;
  findAnyByTokenHash(tokenHash: string): Promise<SessionEntity | null>;
  revokeIfActive(tokenHash: string): Promise<SessionEntity | null>;
  rotate(
    oldTokenHash: string,
    newSession: RotateSessionInput
  ): Promise<{ oldSession: SessionEntity; newSession: SessionEntity } | null>;
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

export interface IResourceRepository {
  listAll(limit?: number): Promise<ApplicationResourceEntity[]>;
  listByContext(context: ApplicationContext): Promise<ApplicationResourceEntity[]>;
  getById(id: string): Promise<ApplicationResourceEntity | null>;
  getByItemCode(itemCode: string): Promise<ApplicationResourceEntity | null>;
  getTree(context?: ApplicationContext): Promise<ResourceTreeNodeEntity[]>;
  listMenusForRole(role: UserRole): Promise<MenuItemDTO[]>;
}

export interface IPermissionRepository {
  listByUserId(userId: string): Promise<ApplicationPermissionEntity[]>;
  listByGroupId(groupId: string): Promise<ApplicationPermissionEntity[]>;
  listAll(): Promise<ApplicationPermissionEntity[]>;
  getAclMap(userId: string, groupIds: string[]): Promise<PermissionAclTupleEntity[]>;
  deleteByUser(userId: string): Promise<void>;
  deleteByGroup(groupId: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  create(permission: {
    id?: string;
    user_id?: string | null;
    group_id?: string | null;
    resource_id: string;
    action: ResourceAction;
    effect?: PermissionEffect;
    tenant_id?: string | null;
  }): Promise<ApplicationPermissionEntity>;
}

export interface IApplicationRepository {
  getDefaultApplication(): Promise<PlatformApplicationEntity | null>;
  getApplicationById(id: string): Promise<PlatformApplicationEntity | null>;
  getApplicationByCode(code: string): Promise<PlatformApplicationEntity | null>;
  updateApplication(id: string, data: UpdatePlatformApplicationDto): Promise<PlatformApplicationEntity>;
  getTenantApplicationConfig(applicationId: string, tenantId?: string | null): Promise<TenantApplicationConfigEntity>;
  upsertTenantApplicationConfig(
    applicationId: string,
    tenantId: string | null | undefined,
    data: UpdateTenantApplicationConfigDto
  ): Promise<TenantApplicationConfigEntity>;
}

export interface IAMUnitOfWork {
  tenants: ITenantRepository;
  users: IUserRepository;
  groups: IGroupRepository;
  sessions: ISessionRepository;
  lockouts: ILockoutRepository;
  auditLogs: IAuditLogRepository;
  resources: IResourceRepository;
  permissions: IPermissionRepository;
  applications: IApplicationRepository;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

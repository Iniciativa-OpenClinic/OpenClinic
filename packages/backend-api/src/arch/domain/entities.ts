import type { BaseEntity } from '../../shared/domain/base-entity.js';
import type { UserRole, TenantStatus } from '../../shared/domain/enums.js';

export interface TenantEntity extends BaseEntity {
  name: string;
  slug: string | null;
  status: TenantStatus;
  tax_id?: string | null;
  cnpj?: string | null;
  contact_name?: string | null;
  contact_title?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  postal_code?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  is_default: boolean;
  is_active: boolean;
  deleted_at: Date | null;
}

export interface UserEntity extends BaseEntity {
  username: string;
  email: string;
  cpf?: string | null;
  hashed_password: string | null;
  full_name: string;
  display_name: string;
  job_title?: string | null;
  role: UserRole;
  is_active: boolean;
  access_count: number;
  last_access: Date | null;
  require_password_change: boolean;
  password_reset_token: string | null;
  password_reset_expires_at: Date | null;
  tenant_id: string | null;
  is_tenant_owner: boolean;
  timezone: string | null;
  locale: string | null;
  deleted_at?: Date | null;
}

export interface SessionEntity extends BaseEntity {
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface LockoutEntity extends BaseEntity {
  identifier: string;
  attempt_count: number;
  locked_until: Date | null;
  tenant_id: string | null;
}

export interface GroupEntity extends BaseEntity {
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  tenant_id: string | null;
  deleted_at: Date | null;
}

export interface UserGroupEntity extends BaseEntity {
  user_id: string;
  group_id: string;
}

export interface AuditLogEntry {
  id?: string;
  user_id: string | null;
  username: string | null;
  action: string;
  resource: string;
  status?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: Record<string, unknown> | null;
  tenant_id?: string | null;
}

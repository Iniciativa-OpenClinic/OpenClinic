import type { UserRole } from '../../shared/domain/enums.js';

export interface LoginRequestDTO {
  identifier: string;
  password: string;
}

export interface RegisterRequestDTO {
  email: string;
  username: string;
  password: string;
  full_name: string;
  display_name?: string;
}

export interface LoginResponseDTO {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  user: UserProfileDTO;
}

export interface UserProfileDTO {
  id: string;
  username: string;
  email: string;
  full_name: string;
  display_name: string;
  job_title?: string | null;
  role: UserRole;
  is_active: boolean;
  tenant_id: string | null;
  last_access: Date | null;
}

export interface RefreshRequestDTO {
  refresh_token: string;
}

export interface RefreshResponseDTO {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}

export interface ActionResponseDTO<T = unknown> {
  code: string;
  message: string;
  data?: T;
}

export interface UserListItemDTO {
  id: string;
  email: string;
  username: string;
  full_name: string;
  display_name?: string | null;
  job_title?: string | null;
  role: UserRole;
  is_active: boolean;
  is_locked?: boolean;
  is_tenant_owner?: boolean;
  tenant_id?: string | null;
  last_access?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface GroupListItemDTO {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  member_count: number;
  tenant_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface CreateGroupDTO {
  name: string;
  description: string;
  is_active?: boolean;
  is_default?: boolean;
  tenant_id?: string | null;
}

export interface UpdateGroupDTO {
  name?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface GroupMembersResponseDTO {
  group: GroupListItemDTO;
  members: UserListItemDTO[];
  available_users: UserListItemDTO[];
}

export interface UserGroupsResponseDTO {
  user: UserListItemDTO;
  groups: GroupListItemDTO[];
  available_groups: GroupListItemDTO[];
}

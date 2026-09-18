import type {
  UserRole,
  ResourceAction,
  PermissionEffect,
  ResourceType,
  ApplicationContext,
} from '@openclinic/core/shared';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string;
  display_name: string;
  job_title?: string | null;
  role: UserRole;
  is_active: boolean;
  tenant_id: string | null;
  last_access: string | null;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenPayload {
  sub: string;
  role: string;
  email: string;
  tenant_id?: string;
  iat: number;
  exp: number;
}

export interface MenuItem {
  id: string;
  item_code: string;
  label: string;
  icon: string | null;
  route: string | null;
  sort_order: number;
  min_role: UserRole;
  description: string | null;
}

export interface MenuResponse {
  role: string;
  items: MenuItem[];
}

export interface IAMCapability {
  key: string;
  label: string;
  icon?: string | null;
  route?: string | null;
  resource_type: ResourceType;
  context: ApplicationContext;
  actions: ResourceAction[];
}

export interface NavigationMenuItem {
  id: string;
  item_code: string;
  label: string;
  icon?: string | null;
  route?: string | null;
  sort_order: number;
  min_role: UserRole;
  context: ApplicationContext;
  children?: NavigationMenuItem[];
}

export interface NavigationMenuGroup {
  context: ApplicationContext;
  title: string;
  items: NavigationMenuItem[];
}

export interface AclPermissionRecord {
  id: string;
  resource_key: string;
  actions: ResourceAction[];
  effect: PermissionEffect;
}

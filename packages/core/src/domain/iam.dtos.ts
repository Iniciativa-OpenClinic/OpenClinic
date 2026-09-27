import type { ResourceAction, PermissionEffect, ApplicationContext, ResourceType, UserRole } from './enums.js';

export interface IAMCapabilityDTO {
  key: string;
  label: string;
  icon?: string | null;
  route?: string | null;
  resource_type: ResourceType;
  context: ApplicationContext;
  actions: ResourceAction[];
}

export interface ApplicationPermissionSyncItemDTO {
  resource_key: string;
  actions: ResourceAction[];
  effect?: PermissionEffect;
}

export interface ApplicationPermissionSyncDTO {
  user_id?: string | null;
  group_id?: string | null;
  permissions: ApplicationPermissionSyncItemDTO[];
}

export interface NavigationMenuItemDTO {
  id: string;
  item_code: string;
  label: string;
  icon?: string | null;
  route?: string | null;
  sort_order: number;
  min_role: UserRole;
  context: ApplicationContext;
  children?: NavigationMenuItemDTO[];
}

export interface NavigationMenuGroupDTO {
  context: ApplicationContext;
  title: string;
  items: NavigationMenuItemDTO[];
}

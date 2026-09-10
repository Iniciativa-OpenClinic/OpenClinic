import type {
  LoginResponse,
  UserProfile,
  RefreshResponse,
  MenuResponse,
  IAMCapability,
  NavigationMenuGroup,
  AclPermissionRecord,
} from '../types/auth.js';
import {
  UserRole,
  ApplicationContext,
  ResourceAction,
  PermissionEffect,
  TenantStatus,
  LoginIdentifierType,
} from '@openclinic/core/shared';
import { getTranslation, getStoredLocale } from '../i18n/index.js';

const API_BASE = '/api/v1';

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly detail: string;
  public readonly details?: Record<string, unknown>;

  constructor(detail: string, code: string = 'ERR_INTERNAL', status: number = 500, details?: Record<string, unknown>) {
    super(detail);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.details = details;
  }
}

export interface ActionResponse<T = unknown> {
  code: string;
  message: string;
  data?: T;
}

export function setTokens(accessToken: string | null, refreshToken: string | null): void {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
}

export function clearTokens(): void {
  _accessToken = null;
  _refreshToken = null;
}

export function getAccessToken(): string | null {
  return _accessToken;
}


type SessionExpiredHandler = () => void;
let _onSessionExpired: SessionExpiredHandler | null = null;
let _refreshPromise: Promise<RefreshResponse> | null = null;

export function setOnSessionExpired(handler: SessionExpiredHandler | null): void {
  _onSessionExpired = handler;
}

async function apiFetch<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const currentLocale = getStoredLocale();
  const headers: Record<string, string> = {
    'Accept-Language': currentLocale === 'en-US' ? 'en-US,en;q=0.9' : 'pt-BR,pt;q=0.9',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    // Interceptar 401 para tentativa de Silent Refresh
    if (response.status === 401 && !isRetry && path !== '/auth/login' && path !== '/auth/refresh') {
      if (_refreshToken) {
        try {
          if (!_refreshPromise) {
            _refreshPromise = refreshTokens().finally(() => {
              _refreshPromise = null;
            });
          }
          await _refreshPromise;
          return apiFetch<T>(path, options, true);
        } catch {
          if (_onSessionExpired) {
            _onSessionExpired();
          }
        }
      } else {
        if (_onSessionExpired) {
          _onSessionExpired();
        }
      }
    }

    const errorBody = await response.json().catch(() => ({
      code: 'ERR_COMMUNICATION',
      detail: getTranslation('ERROR_COMMUNICATION'),
    }));
    const errorMsg = errorBody.detail || errorBody.title || getTranslation('ERROR_HTTP_GENERIC', { status: response.status });
    throw new ApiError(errorMsg, errorBody.code || 'ERR_UNKNOWN', response.status, errorBody.details);
  }
  return response.json() as Promise<T>;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/auth/profile');
}

export async function refreshTokens(): Promise<RefreshResponse> {
  if (!_refreshToken) throw new ApiError(getTranslation('ERROR_NO_REFRESH_TOKEN'), 'ERR_TOKEN_EXPIRED', 401);
  const data = await apiFetch<RefreshResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: _refreshToken }) });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: _refreshToken }) });
  } finally {
    clearTokens();
  }
}

export async function getMenu(): Promise<MenuResponse> {
  return apiFetch<MenuResponse>('/auth/menu');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResponse<{ id: string }>> {
  return apiFetch<ActionResponse<{ id: string }>>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function forgotPassword(identifier: string): Promise<ActionResponse<{ simulated_email?: string; reset_token?: string; expires_in_minutes: number }>> {
  return apiFetch<ActionResponse<{ simulated_email?: string; reset_token?: string; expires_in_minutes: number }>>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<ActionResponse<{ id: string }>> {
  return apiFetch<ActionResponse<{ id: string }>>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  cpf?: string | null;
  full_name: string;
  display_name: string;
  job_title?: string | null;
  role: UserRole;
  role_id?: string;
  is_active: boolean;
  is_tenant_owner?: boolean;
  tenant_id?: string | null;
  is_locked?: boolean;
  last_access?: string | null;
  created_at?: string;
}

export async function listUsers(): Promise<UserListItem[]> {
  return apiFetch<UserListItem[]>('/iam/users');
}

export async function createUser(data: {
  email: string;
  username: string;
  cpf?: string | null;
  full_name: string;
  display_name?: string | null;
  job_title?: string | null;
  password: string;
  role: UserRole;
  is_active?: boolean;
}): Promise<ActionResponse<UserListItem>> {
  return apiFetch<ActionResponse<UserListItem>>('/iam/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  userId: string,
  data: {
    email: string;
    username: string;
    cpf?: string | null;
    full_name: string;
    display_name?: string | null;
    job_title?: string | null;
    role: UserRole;
    is_active?: boolean;
  }
): Promise<ActionResponse<UserListItem>> {
  return apiFetch<ActionResponse<UserListItem>>(`/iam/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function adminResetPassword(userId: string, newPassword: string): Promise<ActionResponse<{ id: string }>> {
  return apiFetch<ActionResponse<{ id: string }>>(`/iam/users/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export async function toggleUserStatus(userId: string): Promise<ActionResponse<{ id: string; is_active: boolean }>> {
  return apiFetch<ActionResponse<{ id: string; is_active: boolean }>>(`/iam/users/${userId}/status`, {
    method: 'PATCH',
  });
}

export async function deleteUser(userId: string): Promise<ActionResponse<{ id: string }>> {
  return apiFetch<ActionResponse<{ id: string }>>(`/iam/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function unlockUser(userId: string): Promise<ActionResponse<{ id: string }>> {
  return apiFetch<ActionResponse<{ id: string }>>(`/iam/users/${userId}/unlock`, {
    method: 'POST',
  });
}

// ── GRUPOS DE USUÁRIOS & ASSOCIAÇÕES ──

export interface GroupListItem {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default?: boolean;
  member_count: number;
  tenant_id: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface GroupMembersResponse {
  group: GroupListItem;
  members: UserListItem[];
  available_users: UserListItem[];
}

export interface UserGroupsResponse {
  user: UserListItem;
  groups: GroupListItem[];
  available_groups: GroupListItem[];
}

export async function listGroups(): Promise<GroupListItem[]> {
  return apiFetch<GroupListItem[]>('/iam/groups');
}

export async function createGroup(data: { name: string; description: string; is_active?: boolean }): Promise<ActionResponse<GroupListItem>> {
  return apiFetch<ActionResponse<GroupListItem>>('/iam/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGroup(groupId: string, data: { name?: string; description?: string; is_active?: boolean }): Promise<ActionResponse<GroupListItem>> {
  return apiFetch<ActionResponse<GroupListItem>>(`/iam/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGroup(groupId: string): Promise<ActionResponse<{ id: string; name: string }>> {
  return apiFetch<ActionResponse<{ id: string; name: string }>>(`/iam/groups/${groupId}`, {
    method: 'DELETE',
  });
}

export async function getGroupMembers(groupId: string): Promise<GroupMembersResponse> {
  return apiFetch<GroupMembersResponse>(`/iam/groups/${groupId}/members`);
}

export async function addGroupMember(groupId: string, userId: string): Promise<ActionResponse<{ groupId: string; userId: string }>> {
  return apiFetch<ActionResponse<{ groupId: string; userId: string }>>(`/iam/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeGroupMember(groupId: string, userId: string): Promise<ActionResponse<{ groupId: string; userId: string }>> {
  return apiFetch<ActionResponse<{ groupId: string; userId: string }>>(`/iam/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function getUserGroups(userId: string): Promise<UserGroupsResponse> {
  return apiFetch<UserGroupsResponse>(`/iam/users/${userId}/groups`);
}

export async function addUserToGroup(userId: string, groupId: string): Promise<ActionResponse<{ userId: string; groupId: string }>> {
  return apiFetch<ActionResponse<{ userId: string; groupId: string }>>(`/iam/users/${userId}/groups`, {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId }),
  });
}

export async function removeUserFromGroup(userId: string, groupId: string): Promise<ActionResponse<{ userId: string; groupId: string }>> {
  return apiFetch<ActionResponse<{ userId: string; groupId: string }>>(`/iam/users/${userId}/groups/${groupId}`, {
    method: 'DELETE',
  });
}

// ── IAM & CONTROLE DE ACESSO (RBAC + ACL) ──

export async function getPermissions(): Promise<string[]> {
  return apiFetch<string[]>('/iam/permissions');
}

export async function getCapabilities(): Promise<IAMCapability[]> {
  return apiFetch<IAMCapability[]>('/iam/capabilities');
}

export async function getNavigation(context: ApplicationContext = ApplicationContext.BUSINESS): Promise<NavigationMenuGroup[]> {
  return apiFetch<NavigationMenuGroup[]>(`/iam/navigation?context=${context}`);
}

export async function listResources(): Promise<any[]> {
  return apiFetch<any[]>('/iam/resources');
}

export async function getResourceTree(context?: ApplicationContext): Promise<any[]> {
  return apiFetch<any[]>(`/iam/resources/tree${context ? `?context=${context}` : ''}`);
}

export async function getUserAcl(userId: string): Promise<AclPermissionRecord[]> {
  return apiFetch<AclPermissionRecord[]>(`/iam/permissions/user/${userId}`);
}

export async function getUserInheritedAcl(userId: string): Promise<AclPermissionRecord[]> {
  return apiFetch<AclPermissionRecord[]>(`/iam/permissions/user/${userId}/inherited`);
}

export async function getGroupAcl(groupId: string): Promise<AclPermissionRecord[]> {
  return apiFetch<AclPermissionRecord[]>(`/iam/permissions/group/${groupId}`);
}

export async function syncPermissions(payload: {
  user_id?: string;
  group_id?: string;
  permissions: { resource_key: string; actions: ResourceAction[]; effect?: PermissionEffect }[];
}): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/iam/permissions/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


// ── SISTEMA & PLATAFORMA (SYS_APPLICATIONS & CONFIGS) ──

export interface PlatformApplicationData {
  id: string;
  code: string;
  appName: string;
  appVersion: string;
  appLogoUrl: string | null;
  appFaviconUrl: string | null;
  appSubtitle: string | null;
  appDescription: string | null;
  defaultLocale: string;
  defaultSupportedLocales: string[];
  defaultTimezone: string;
  defaultDialingCode: string;
  defaultMaxLoginAttempts: number;
  defaultLockoutDurationMinutes: number;
  defaultSessionTimeoutMinutes: number;
  defaultMinPasswordLength: number;
  defaultMfaEnabled: boolean;
  defaultPasswordResetTokenTtlHours: number;
  defaultEnableAuditLog: boolean;
  defaultAuditRetentionDays: number;
  defaultAcceptedLoginMethods: string[];
  defaultExtraSettings: Record<string, unknown>;
  primaryLoginIdentifier: LoginIdentifierType;
  isMultiTenant: boolean;
  isDefaultApplication: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantApplicationConfigData {
  id: string;
  applicationId: string;
  tenantId: string | null;
  isPrimaryForTenant: boolean;
  isActive: boolean;
  enforceDocumentAcceptanceOnLogin: boolean;
  configJson: {
    operatingHours?: {
      weekdays?: string;
      saturdays?: string;
      sundays?: string;
    };
    appointmentIntervalMinutes?: number;
    cancellationLeadTimeHours?: number;
    contactPhone?: string;
    contactEmail?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TenantApplicationConfigResponse {
  application: {
    id: string;
    code: string;
    appName: string;
    appVersion: string;
    appSubtitle: string | null;
    appDescription: string | null;
    appLogoUrl: string | null;
    appFaviconUrl: string | null;
    defaultLocale: string;
    defaultSupportedLocales: string[];
    defaultTimezone: string;
    isMultiTenant: boolean;
  };
  config: TenantApplicationConfigData;
}

export async function getPlatformApplication(): Promise<PlatformApplicationData> {
  return apiFetch<PlatformApplicationData>('/arch/platform/application');
}

export async function updatePlatformApplication(
  data: Partial<PlatformApplicationData>
): Promise<ActionResponse<PlatformApplicationData>> {
  return apiFetch<ActionResponse<PlatformApplicationData>>('/arch/platform/application', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getCurrentApplicationConfig(): Promise<TenantApplicationConfigResponse> {
  return apiFetch<TenantApplicationConfigResponse>('/arch/application-configs/current');
}

export async function updateCurrentApplicationConfig(data: {
  isActive?: boolean;
  enforceDocumentAcceptanceOnLogin?: boolean;
  configJson?: Record<string, unknown>;
}): Promise<ActionResponse<TenantApplicationConfigData>> {
  return apiFetch<ActionResponse<TenantApplicationConfigData>>('/arch/application-configs/current', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export interface PublicConfig {
  appName: string;
  appSubtitle: string | null;
  appVersion: string;
  appLogoUrl: string | null;
  appFaviconUrl: string | null;
  appDescription: string | null;
  tenantName: string;
  defaultLocale: string;
  supportedLocales: string[];
  defaultTimezone: string;
  defaultDialingCode: string;
  acceptedLoginMethods?: string[];
  primaryLoginIdentifier?: LoginIdentifierType;
  // snake_case aliases for backwards compatibility
  app_name?: string;
  app_subtitle?: string | null;
  app_version?: string;
  app_logo_url?: string | null;
  app_favicon_url?: string | null;
  app_description?: string | null;
  tenant_name?: string;
  default_locale?: string;
  supported_locales?: string[];
  default_timezone?: string;
  default_dialing_code?: string;
  primary_login_identifier?: LoginIdentifierType;
}

export type PublicApplicationData = PublicConfig;

export async function getPublicConfig(): Promise<PublicConfig> {
  return apiFetch<PublicConfig>(`/public/config?_t=${Date.now()}`, {
    cache: 'no-store',
  });
}

export async function getPublicApplicationSettings(): Promise<PublicApplicationData> {
  return getPublicConfig();
}

export function applyDocumentBranding(
  title?: string | null,
  faviconUrl?: string | null,
  locale?: string | null
): void {
  if (typeof document === 'undefined') return;
  if (locale && locale.trim()) {
    document.documentElement.lang = locale.trim();
  }
  if (title && title.trim()) {
    document.title = title.trim();
  }
  if (faviconUrl && faviconUrl.trim()) {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl.trim();
  }
}

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  taxId?: string | null;
  cnpj?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isDefault: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type TenantPayload = Partial<Omit<TenantData, 'id' | 'createdAt' | 'updatedAt'>>;

export async function listTenants(): Promise<TenantData[]> {
  return apiFetch<TenantData[]>('/arch/tenants');
}

export async function getTenantById(id: string): Promise<TenantData> {
  return apiFetch<TenantData>(`/arch/tenants/${encodeURIComponent(id)}`);
}

export async function createTenant(data: TenantPayload): Promise<ActionResponse<TenantData>> {
  return apiFetch<ActionResponse<TenantData>>('/arch/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTenant(id: string, data: TenantPayload): Promise<ActionResponse<TenantData>> {
  return apiFetch<ActionResponse<TenantData>>(`/arch/tenants/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTenant(id: string): Promise<ActionResponse<void>> {
  return apiFetch<ActionResponse<void>>(`/arch/tenants/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export { apiFetch, TenantStatus };



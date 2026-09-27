import React, { useState } from 'react';
import { ResourceAction, PermissionEffect, ApplicationContext, UserRole, PermissionTargetType, ROLE_HIERARCHY } from '@openclinic/core/shared';
import { useI18n, type TranslationKey } from '../../i18n/index.js';
import { AlertBanner, AlertBannerType } from '../../components/AlertBanner.js';
import type { AclPermissionRecord } from '../../types/auth.js';
import type { ResourceTreeNode } from '../types/resource-tree.js';

export interface PermissionTargetInfo {
  type: PermissionTargetType;
  id: string;
  name: string;
  subtitle: string;
  role?: UserRole;
  jobTitle?: string | null;
  isOwner?: boolean;
}

export interface PermissionsMatrixModalProps {
  permissionTarget: PermissionTargetInfo;
  resourceTree: ResourceTreeNode[];
  initialPermissions: AclPermissionRecord[];
  inheritedPermissions: AclPermissionRecord[];
  permissionsLoading: boolean;
  permissionsSaving: boolean;
  feedback: { type: AlertBannerType; msg: string } | null;
  onClose: () => void;
  onSave: (newPermissions: AclPermissionRecord[]) => void;
  isOperatorOwner?: boolean;
}

const availableActions: ResourceAction[] = [
  ResourceAction.READ,
  ResourceAction.WRITE,
  ResourceAction.DELETE,
  ResourceAction.EXECUTE,
];

interface MenuItemSpec {
  code: string;
  icon: string;
  labelKey: TranslationKey;
}

interface MenuSectionSpec {
  id: string;
  titleKey: TranslationKey;
  icon: string;
  context: ApplicationContext;
  items: MenuItemSpec[];
}

const SIDEBAR_SECTIONS: MenuSectionSpec[] = [
  // ── 1. BUSINESS / OPERATIONAL TAB ──
  {
    id: 'attendance',
    titleKey: 'NAV_SECTION_ATTENDANCE',
    icon: '📋',
    context: ApplicationContext.BUSINESS,
    items: [
      { code: 'op_schedule', icon: '📅', labelKey: 'NAV_ATTENDANCE_SCHEDULE' },
      { code: 'op_attendance', icon: '📋', labelKey: 'NAV_ATTENDANCE_QUEUE' },
    ],
  },
  {
    id: 'clinical',
    titleKey: 'NAV_SECTION_CLINICAL',
    icon: '🩺',
    context: ApplicationContext.BUSINESS,
    items: [
      { code: 'op_patients', icon: '🧑‍🤝‍🧑', labelKey: 'NAV_CLINICAL_PATIENTS' },
      { code: 'op_consultations', icon: '🩺', labelKey: 'NAV_CLINICAL_CONSULTATIONS' },
      { code: 'op_pep', icon: '📑', labelKey: 'NAV_CLINICAL_PEP' },
    ],
  },
  {
    id: 'financial',
    titleKey: 'NAV_SECTION_FINANCIAL',
    icon: '💰',
    context: ApplicationContext.BUSINESS,
    items: [
      { code: 'op_billing', icon: '📑', labelKey: 'NAV_FINANCIAL_BILLING' },
      { code: 'op_cashflow', icon: '💰', labelKey: 'NAV_FINANCIAL_CASHFLOW' },
      { code: 'op_payables', icon: '🧾', labelKey: 'NAV_FINANCIAL_PAYABLES' },
    ],
  },
  {
    id: 'registries',
    titleKey: 'NAV_SECTION_BASE_REGISTRIES',
    icon: '🏢',
    context: ApplicationContext.BUSINESS,
    items: [
      { code: 'base_staff', icon: '🩺', labelKey: 'NAV_BASE_STAFF' },
      { code: 'base_health_plans', icon: '🏢', labelKey: 'NAV_BASE_HEALTH_PLANS' },
      { code: 'base_procedures', icon: '💉', labelKey: 'NAV_BASE_PROCEDURES' },
    ],
  },
  {
    id: 'management',
    titleKey: 'NAV_SECTION_MANAGEMENT',
    icon: '📊',
    context: ApplicationContext.BUSINESS,
    items: [
      { code: 'menu_mgmt_indicators', icon: '📈', labelKey: 'NAV_MGMT_INDICATORS' },
      { code: 'menu_mgmt_reports', icon: '📊', labelKey: 'NAV_MGMT_REPORTS' },
    ],
  },

  // ── 2. ARCH / SYSTEM TAB ──
  {
    id: 'system',
    titleKey: 'NAV_SECTION_SYSTEM',
    icon: '⚙️',
    context: ApplicationContext.ARCH,
    items: [
      { code: 'menu_sys_settings', icon: '⚙️', labelKey: 'NAV_SYS_SETTINGS' },
      { code: 'menu_sys_users', icon: '👥', labelKey: 'NAV_SYS_USERS' },
      { code: 'menu_sys_institution', icon: '🏥', labelKey: 'NAV_SYS_INSTITUTION' },
      { code: 'menu_sys_audit', icon: '🛡️', labelKey: 'NAV_SYS_AUDIT' },
    ],
  },
  {
    id: 'platform',
    titleKey: 'NAV_SECTION_PLATFORM',
    icon: '🛠️',
    context: ApplicationContext.ARCH,
    items: [
      { code: 'menu_platform_settings', icon: '👑', labelKey: 'NAV_PLATFORM_SETTINGS' },
      { code: 'menu_platform_tenants', icon: '🏢', labelKey: 'NAV_PLATFORM_TENANTS' },
      { code: 'menu_platform_api_keys', icon: '🔑', labelKey: 'NAV_PLATFORM_API_KEYS' },
      { code: 'menu_platform_webhooks', icon: '⚡', labelKey: 'NAV_PLATFORM_WEBHOOKS' },
      { code: 'menu_platform_policies', icon: '📜', labelKey: 'NAV_PLATFORM_POLICIES' },
    ],
  },
];

export const PermissionsMatrixModal: React.FC<PermissionsMatrixModalProps> = ({
  permissionTarget,
  resourceTree,
  initialPermissions,
  inheritedPermissions,
  permissionsLoading,
  permissionsSaving,
  feedback,
  onClose,
  onSave,
  isOperatorOwner = false,
}) => {
  const { t } = useI18n();
  const [currentPermissions, setCurrentPermissions] = useState<AclPermissionRecord[]>(initialPermissions);
  const [activeTab, setActiveTab] = useState<ApplicationContext>(ApplicationContext.BUSINESS);

  React.useEffect(() => {
    setCurrentPermissions(initialPermissions);
  }, [initialPermissions]);

  const resourceMinRoleMap = React.useMemo(() => {
    const map = new Map<string, UserRole>();
    const traverse = (nodes: ResourceTreeNode[]) => {
      for (const n of nodes) {
        if (n.min_role) {
          map.set(n.item_code, n.min_role);
        }
        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      }
    };
    traverse(resourceTree);
    return map;
  }, [resourceTree]);

  const getItemMinRole = (itemCode: string): UserRole => {
    if (resourceMinRoleMap.has(itemCode)) {
      return resourceMinRoleMap.get(itemCode)!;
    }
    if (itemCode.startsWith('menu_platform_')) return UserRole.OWNER;
    if (itemCode.startsWith('menu_sys_')) return UserRole.ADMIN;
    return UserRole.USER;
  };

  const isItemRoleIncompatible = (itemCode: string): boolean => {
    if (permissionTarget.type !== PermissionTargetType.USER) return false;
    const targetRole = permissionTarget.role ?? UserRole.USER;
    const targetLevel = ROLE_HIERARCHY[targetRole] ?? 1;
    const requiredLevel = ROLE_HIERARCHY[getItemMinRole(itemCode)] ?? 1;
    return targetLevel < requiredLevel;
  };

  const isMatrixActionDirect = (resourceKey: string, action: ResourceAction): boolean => {
    if (permissionTarget.isOwner) return true;
    const direct = currentPermissions.find(
      (p) => p.resource_key === resourceKey && p.effect !== PermissionEffect.DENY
    );
    return direct ? direct.actions.includes(action) : false;
  };

  const isMatrixActionGranted = (resourceKey: string, action: ResourceAction): boolean => {
    if (permissionTarget.isOwner) return true;
    if (isMatrixActionDenied(resourceKey, action)) return false;
    if (isMatrixActionDirect(resourceKey, action)) return true;
    if (permissionTarget.type === PermissionTargetType.USER) {
      return isMatrixActionInherited(resourceKey, action);
    }
    return false;
  };

  const isMatrixActionInherited = (resourceKey: string, action: ResourceAction): boolean => {
    if (permissionTarget.type !== PermissionTargetType.USER || permissionTarget.isOwner) return false;
    const inherited = inheritedPermissions.find((p) => p.resource_key === resourceKey);
    return inherited ? inherited.actions.includes(action) : false;
  };

  const isMatrixActionDenied = (resourceKey: string, action: ResourceAction): boolean => {
    if (permissionTarget.isOwner) return false;
    const deny = currentPermissions.find(
      (p) => p.resource_key === resourceKey && p.effect === PermissionEffect.DENY
    );
    return deny ? deny.actions.includes(action) : false;
  };

  const collectResourceAndDescendants = (resourceCode: string): string[] => {
    const findNode = (nodes: ResourceTreeNode[]): ResourceTreeNode | null => {
      for (const n of nodes) {
        if (n.item_code === resourceCode) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(resourceTree);
    if (!node) return [resourceCode];

    const getKeys = (n: ResourceTreeNode): string[] => {
      const keys = [n.item_code];
      if (n.children) {
        for (const c of n.children) keys.push(...getKeys(c));
      }
      return keys;
    };

    return getKeys(node);
  };

  const toggleSinglePermission = (resourceKey: string, action: ResourceAction) => {
    if (permissionTarget.isOwner) return;
    if (isItemRoleIncompatible(resourceKey)) return;
    const keysToModify = collectResourceAndDescendants(resourceKey);
    const perms = [...currentPermissions];
    const isInherited = isMatrixActionInherited(resourceKey, action);
    const isDenied = isMatrixActionDenied(resourceKey, action);
    const isDirect = isMatrixActionDirect(resourceKey, action);

    if (permissionTarget.type === PermissionTargetType.USER && isInherited) {
      const shouldDeny = !isDenied;

      for (const key of keysToModify) {
        const allowIndex = perms.findIndex(
          (p) => p.resource_key === key && p.effect !== PermissionEffect.DENY
        );
        const denyIndex = perms.findIndex(
          (p) => p.resource_key === key && p.effect === PermissionEffect.DENY
        );

        if (shouldDeny) {
          if (allowIndex >= 0) {
            const p = { ...perms[allowIndex] };
            p.actions = p.actions.filter((a) => a !== action);
            if (p.actions.length === 0) perms.splice(allowIndex, 1);
            else perms[allowIndex] = p;
          }
          const curDenyIdx = perms.findIndex((p) => p.resource_key === key && p.effect === PermissionEffect.DENY);
          if (curDenyIdx >= 0) {
            const p = { ...perms[curDenyIdx] };
            if (!p.actions.includes(action)) p.actions = [...p.actions, action];
            perms[curDenyIdx] = p;
          } else {
            perms.push({
              id: '',
              resource_key: key,
              actions: [action],
              effect: PermissionEffect.DENY,
            });
          }
        } else {
          if (denyIndex >= 0) {
            const p = { ...perms[denyIndex] };
            p.actions = p.actions.filter((a) => a !== action);
            if (p.actions.length === 0) perms.splice(denyIndex, 1);
            else perms[denyIndex] = p;
          }
        }
      }
    } else {
      const isGranting = !isDirect;

      for (const key of keysToModify) {
        const allowIndex = perms.findIndex(
          (p) => p.resource_key === key && p.effect !== PermissionEffect.DENY
        );
        const denyIndex = perms.findIndex(
          (p) => p.resource_key === key && p.effect === PermissionEffect.DENY
        );

        if (isGranting) {
          if (denyIndex >= 0) {
            const p = { ...perms[denyIndex] };
            p.actions = p.actions.filter((a) => a !== action);
            if (p.actions.length === 0) perms.splice(denyIndex, 1);
            else perms[denyIndex] = p;
          }
          const curAllowIdx = perms.findIndex((p) => p.resource_key === key && p.effect !== PermissionEffect.DENY);
          if (curAllowIdx >= 0) {
            const p = { ...perms[curAllowIdx] };
            if (!p.actions.includes(action)) p.actions = [...p.actions, action];
            perms[curAllowIdx] = p;
          } else {
            perms.push({
              id: '',
              resource_key: key,
              actions: [action],
              effect: PermissionEffect.ALLOW,
            });
          }
        } else {
          if (allowIndex >= 0) {
            const p = { ...perms[allowIndex] };
            p.actions = p.actions.filter((a) => a !== action);
            if (p.actions.length === 0) perms.splice(allowIndex, 1);
            else perms[allowIndex] = p;
          }
        }
      }
    }

    setCurrentPermissions(perms);
  };

  // Toggle do grupo de menu inteiro (marca / desmarca todos os itens do grupo)
  const toggleSectionAll = (sectionItems: MenuItemSpec[]) => {
    if (permissionTarget.isOwner) return;
    const eligibleItems = sectionItems.filter((item) => !isItemRoleIncompatible(item.code));
    if (eligibleItems.length === 0) return;
    const perms = [...currentPermissions];

    // Check whether all items and actions are already granted
    const allGranted = eligibleItems.every((item) =>
      availableActions.every((action) => isMatrixActionGranted(item.code, action))
    );

    const allKeys: string[] = [];
    eligibleItems.forEach((item) => allKeys.push(...collectResourceAndDescendants(item.code)));

    for (const key of allKeys) {
      const allowIndex = perms.findIndex((p) => p.resource_key === key && p.effect !== PermissionEffect.DENY);
      const denyIndex = perms.findIndex((p) => p.resource_key === key && p.effect === PermissionEffect.DENY);

      if (allGranted) {
        // Deselect all actions for the group
        if (allowIndex >= 0) perms.splice(allowIndex, 1);
        const curDeny = perms.findIndex((p) => p.resource_key === key && p.effect === PermissionEffect.DENY);
        if (curDeny >= 0) perms.splice(curDeny, 1);
      } else {
        // Grant all actions for the group
        if (denyIndex >= 0) perms.splice(denyIndex, 1);
        const curAllow = perms.findIndex((p) => p.resource_key === key && p.effect !== PermissionEffect.DENY);
        if (curAllow >= 0) {
          perms[curAllow] = { ...perms[curAllow], actions: [...availableActions] };
        } else {
          perms.push({ id: '', resource_key: key, actions: [...availableActions], effect: PermissionEffect.ALLOW });
        }
      }
    }

    setCurrentPermissions(perms);
  };

  // Toggle a specific action across all section items
  const toggleSectionAction = (sectionItems: MenuItemSpec[], action: ResourceAction) => {
    if (permissionTarget.isOwner) return;
    const eligibleItems = sectionItems.filter((item) => !isItemRoleIncompatible(item.code));
    if (eligibleItems.length === 0) return;
    const perms = [...currentPermissions];

    const allHaveAction = eligibleItems.every((item) => isMatrixActionGranted(item.code, action));
    const allKeys: string[] = [];
    eligibleItems.forEach((item) => allKeys.push(...collectResourceAndDescendants(item.code)));

    for (const key of allKeys) {
      const isInherited = isMatrixActionInherited(key, action);
      const allowIndex = perms.findIndex((p) => p.resource_key === key && p.effect !== PermissionEffect.DENY);
      const denyIndex = perms.findIndex((p) => p.resource_key === key && p.effect === PermissionEffect.DENY);

      if (allHaveAction) {
        // Remove action (if inherited by user, override with DENY; if direct, remove ALLOW)
        if (permissionTarget.type === PermissionTargetType.USER && isInherited) {
          if (allowIndex >= 0) {
            const p = { ...perms[allowIndex] };
            p.actions = p.actions.filter((a) => a !== action);
            if (p.actions.length === 0) perms.splice(allowIndex, 1);
            else perms[allowIndex] = p;
          }
          const curDeny = perms.findIndex((p) => p.resource_key === key && p.effect === PermissionEffect.DENY);
          if (curDeny >= 0) {
            const p = { ...perms[curDeny] };
            if (!p.actions.includes(action)) p.actions = [...p.actions, action];
            perms[curDeny] = p;
          } else {
            perms.push({ id: '', resource_key: key, actions: [action], effect: PermissionEffect.DENY });
          }
        } else {
          if (allowIndex >= 0) {
            const p = { ...perms[allowIndex] };
            p.actions = p.actions.filter((a) => a !== action);
            if (p.actions.length === 0) perms.splice(allowIndex, 1);
            else perms[allowIndex] = p;
          }
        }
      } else {
        // Grant action (if previously DENY, remove DENY; if not inherited, add ALLOW)
        if (denyIndex >= 0) {
          const p = { ...perms[denyIndex] };
          p.actions = p.actions.filter((a) => a !== action);
          if (p.actions.length === 0) perms.splice(denyIndex, 1);
          else perms[denyIndex] = p;
        }
        if (!isInherited) {
          const curAllow = perms.findIndex((p) => p.resource_key === key && p.effect !== PermissionEffect.DENY);
          if (curAllow >= 0) {
            const p = { ...perms[curAllow] };
            if (!p.actions.includes(action)) p.actions = [...p.actions, action];
            perms[curAllow] = p;
          } else {
            perms.push({ id: '', resource_key: key, actions: [action], effect: PermissionEffect.ALLOW });
          }
        }
      }
    }

    setCurrentPermissions(perms);
  };

  // Filter sections according to active tab and operator role privileges
  const currentSections = SIDEBAR_SECTIONS.filter((s) => {
    if (s.context !== activeTab) return false;
    if (s.id === 'platform' && !isOperatorOwner) return false;
    return true;
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16,
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 14,
        maxWidth: 860,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2)',
        border: '1px solid #cbd5e1',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {/* Header do Modal */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar / Identification Icon */}
            <div style={{
              width: 42,
              height: 42,
              borderRadius: permissionTarget.type === PermissionTargetType.USER ? '50%' : 10,
              background: permissionTarget.type === PermissionTargetType.USER
                ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: permissionTarget.type === PermissionTargetType.USER ? '1.05rem' : '1.25rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
              flexShrink: 0,
            }}>
              {permissionTarget.type === PermissionTargetType.USER
                ? permissionTarget.name.charAt(0).toUpperCase()
                : '🏢'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.12rem', fontWeight: 800 }}>
                  {permissionTarget.name}
                </h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: permissionTarget.type === PermissionTargetType.USER ? '#e0f2fe' : '#f0fdf4',
                  color: permissionTarget.type === PermissionTargetType.USER ? '#0369a1' : '#15803d',
                  border: permissionTarget.type === PermissionTargetType.USER ? '1px solid #bae6fd' : '1px solid #bbf7d0',
                }}>
                  {permissionTarget.type === PermissionTargetType.USER ? `${t('LABEL_USER')} • ${permissionTarget.role ?? 'USER'}` : t('TAB_USER_GROUPS')}
                </span>
                {permissionTarget.jobTitle && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    background: '#f0f9ff',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    💼 {permissionTarget.jobTitle}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{t('MODAL_PERMISSIONS_TITLE')}</span>
                {permissionTarget.subtitle && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#475569' }}>{permissionTarget.subtitle}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✖
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div style={{ padding: '8px 22px 0' }}>
            <AlertBanner
              type={feedback.type}
              message={feedback.msg}
              onClose={() => {}}
            />
          </div>
        )}

        {/* Banner para Owner */}
        {permissionTarget.isOwner && (
          <div style={{
            margin: '12px 22px 0',
            padding: '8px 12px',
            borderRadius: 8,
            background: '#fef3c7',
            border: '1px solid #fde68a',
            fontSize: '0.78rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span>👑</span>
            <span>
              <strong>{t('PROTECTED_OWNER')}:</strong> {t('PERM_OWNER_NOTICE')}
            </span>
          </div>
        )}

        {/* Barra de Abas & Legenda */}
        <div style={{
          padding: '12px 22px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          {/* Seletor de Abas (Operacional vs Sistema) */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 4 }}>
            <button
              type="button"
              onClick={() => setActiveTab(ApplicationContext.BUSINESS)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                background: activeTab === ApplicationContext.BUSINESS ? '#ffffff' : 'transparent',
                color: activeTab === ApplicationContext.BUSINESS ? '#0284c7' : '#64748b',
                fontWeight: activeTab === ApplicationContext.BUSINESS ? 700 : 500,
                border: 'none',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === ApplicationContext.BUSINESS ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {t('TAB_CONTEXT_BUSINESS')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(ApplicationContext.ARCH)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                background: activeTab === ApplicationContext.ARCH ? '#ffffff' : 'transparent',
                color: activeTab === ApplicationContext.ARCH ? '#0284c7' : '#64748b',
                fontWeight: activeTab === ApplicationContext.ARCH ? 700 : 500,
                border: 'none',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === ApplicationContext.ARCH ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {t('TAB_CONTEXT_SYSTEM')}
            </button>
          </div>

          {/* Legenda Inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.72rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              {t('LEGEND_ALLOWED')}
            </span>
            {permissionTarget.type === PermissionTargetType.USER && (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                  {t('LEGEND_GROUP')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                  {t('LEGEND_DENIED')}
                </span>
              </>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
              {t('LEGEND_NO_ACCESS')}
            </span>
          </div>
        </div>

        {/* Permissions Table with Group Checkboxes */}
        <div style={{ padding: '0 22px 14px', flex: 1, overflowY: 'auto' }}>
          {permissionsLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              {t('PERMISSIONS_LOADING')}
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
                    <th style={{ padding: '9px 14px' }}>{t('TH_RESOURCE_NAME')}</th>
                    <th style={{ padding: '9px 6px', textAlign: 'center', width: 75 }}>{t('ACTION_READ_SHORT')}</th>
                    <th style={{ padding: '9px 6px', textAlign: 'center', width: 75 }}>{t('ACTION_WRITE_SHORT')}</th>
                    <th style={{ padding: '9px 6px', textAlign: 'center', width: 75 }}>{t('ACTION_DELETE_SHORT')}</th>
                    <th style={{ padding: '9px 6px', textAlign: 'center', width: 75 }}>{t('ACTION_EXECUTE_SHORT')}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSections.map((section) => {
                    return (
                      <React.Fragment key={section.id}>
                        {/* Menu Group Header Row */}
                        <tr style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '7px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.85rem' }}>{section.icon}</span>
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  color: '#334155',
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {t(section.titleKey)}
                              </span>
                            </div>
                          </td>

                          {/* Action Checkboxes for Group Row */}
                          {availableActions.map((action) => {
                            const eligibleGroupItems = section.items.filter(
                              (item) => !isItemRoleIncompatible(item.code)
                            );
                            const isAllActionGranted =
                              eligibleGroupItems.length > 0 &&
                              eligibleGroupItems.every((item) =>
                                isMatrixActionGranted(item.code, action)
                              );
                            const isSomeActionGranted = eligibleGroupItems.some((item) =>
                              isMatrixActionGranted(item.code, action)
                            );
                            const isSectionDisabled = eligibleGroupItems.length === 0;

                            return (
                              <td key={action} style={{ textAlign: 'center', padding: '4px' }}>
                                {!permissionTarget.isOwner && (
                                  <input
                                    type="checkbox"
                                    checked={isAllActionGranted}
                                    disabled={isSectionDisabled}
                                    ref={(el) => {
                                      if (el) el.indeterminate = !isAllActionGranted && isSomeActionGranted;
                                    }}
                                    onChange={() => toggleSectionAction(section.items, action)}
                                    title={
                                      isSectionDisabled
                                        ? t('TOOLTIP_SECTION_ROLE_INSUFFICIENT')
                                        : t('TOOLTIP_TOGGLE_SECTION_ACTION', { action, title: t(section.titleKey) })
                                    }
                                    style={{
                                      cursor: isSectionDisabled ? 'not-allowed' : 'pointer',
                                      width: 14,
                                      height: 14,
                                      accentColor: '#0ea5e9',
                                      opacity: isSectionDisabled ? 0.35 : 1,
                                    }}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Itens do Grupo */}
                        {section.items.map((item) => {
                          const itemMinRole = getItemMinRole(item.code);
                          const isRoleIncompatible = isItemRoleIncompatible(item.code);

                          return (
                            <tr
                              key={item.code}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: isRoleIncompatible ? '#fafafa' : '#ffffff',
                              }}
                            >
                              <td style={{ padding: '8px 14px 8px 32px', color: isRoleIncompatible ? '#94a3b8' : '#1e293b', fontWeight: 500 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.90rem', opacity: isRoleIncompatible ? 0.5 : 1 }}>{item.icon}</span>
                                    <span>{t(item.labelKey)}</span>
                                  </div>
                                  {isRoleIncompatible && (
                                    <span
                                      title={t('TOOLTIP_ROLE_INSUFFICIENT_RESOURCE', { role: itemMinRole })}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: '0.66rem',
                                        fontWeight: 700,
                                        background: '#fef2f2',
                                        color: '#b91c1c',
                                        border: '1px solid #fecaca',
                                        borderRadius: 4,
                                        padding: '2px 6px',
                                        cursor: 'help',
                                      }}
                                    >
                                      🔒 {t('BADGE_REQUIRES_ROLE', { role: itemMinRole })}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {availableActions.map((action) => {
                                const isDirect = isMatrixActionDirect(item.code, action);
                                const isInherited = isMatrixActionInherited(item.code, action);
                                const isDenied = isMatrixActionDenied(item.code, action);

                                let btnBg = '#ffffff';
                                let btnColor = '#cbd5e1';
                                let btnBorder = '#e2e8f0';
                                let btnText = '—';
                                let tooltip = t('TOOLTIP_PERM_NONE');

                                if (isRoleIncompatible) {
                                  btnBg = '#f1f5f9';
                                  btnColor = '#94a3b8';
                                  btnBorder = '#e2e8f0';
                                  btnText = '🔒';
                                  tooltip = t('TOOLTIP_PERM_INCOMPATIBLE', { role: itemMinRole });
                                } else if (isDenied) {
                                  btnBg = '#fef2f2';
                                  btnColor = '#dc2626';
                                  btnBorder = '#fecaca';
                                  btnText = '✖';
                                  tooltip = t('TOOLTIP_PERM_DENIED');
                                } else if (isDirect) {
                                  btnBg = '#ecfdf5';
                                  btnColor = '#059669';
                                  btnBorder = '#a7f3d0';
                                  btnText = '✔';
                                  tooltip = t('TOOLTIP_PERM_DIRECT');
                                } else if (isInherited) {
                                  btnBg = '#eff6ff';
                                  btnColor = '#2563eb';
                                  btnBorder = '#bfdbfe';
                                  btnText = '👥';
                                  tooltip = t('TOOLTIP_PERM_INHERITED');
                                }

                                return (
                                  <td key={action} style={{ textAlign: 'center', padding: '5px 4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => toggleSinglePermission(item.code, action)}
                                      disabled={permissionTarget.isOwner || isRoleIncompatible}
                                      title={tooltip}
                                      style={{
                                        width: 28,
                                        height: 26,
                                        borderRadius: 5,
                                        background: btnBg,
                                        color: btnColor,
                                        border: `1px solid ${btnBorder}`,
                                        fontWeight: 700,
                                        fontSize: '0.72rem',
                                        cursor: permissionTarget.isOwner || isRoleIncompatible ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: isRoleIncompatible ? 0.45 : 1,
                                        transition: 'all 0.1s ease',
                                      }}
                                    >
                                      {btnText}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div style={{
          padding: '12px 22px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
            💡 {t('PERMISSIONS_FOOTER_HINT')}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('BTN_CANCEL')}
            </button>

            <button
              type="button"
              onClick={() => onSave(currentPermissions)}
              disabled={permissionsSaving || permissionTarget.isOwner}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: '#0ea5e9',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: permissionsSaving || permissionTarget.isOwner ? 'not-allowed' : 'pointer',
                opacity: permissionsSaving || permissionTarget.isOwner ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {permissionsSaving ? t('BTN_PROCESSING') : t('BTN_SAVE')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

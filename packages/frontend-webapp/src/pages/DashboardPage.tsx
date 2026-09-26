import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  getMenu,
  getResourceTree,
  getUserAcl,
  getUserInheritedAcl,
  getGroupAcl,
  syncPermissions,
  type UserListItem,
  type GroupListItem,
} from '../services/api.js';
import {
  ResourceAction,
  UserRole,
  PermissionTargetType,
  APP_RESOURCE_MANIFEST,
} from '@openclinic/core/shared';
import { t, useTranslation } from '../i18n/index.js';
import type { MenuItem, AclPermissionRecord } from '../types/auth.js';
import { AlertBanner, AlertBannerType } from '../components/AlertBanner.js';
import {
  type ResourceTreeNode,
  renderResourceIcon,
} from '../arch/types/resource-tree.js';
import { MainLayout } from '../arch/layout/MainLayout.js';

// Arch Pages & Modals
import { ProfileView } from '../arch/pages/ProfileView.js';
import { SecurityView } from '../arch/pages/SecurityView.js';
import { UsersManagementView } from '../arch/pages/UsersManagementView.js';
import { PermissionsMatrixModal, type PermissionTargetInfo } from '../arch/components/PermissionsMatrixModal.js';
import { AuditLogsView } from '../arch/pages/AuditLogsView.js';
import { ApplicationSettingsView } from '../arch/pages/ApplicationSettingsView.js';
import { PlatformSettingsView } from '../arch/pages/PlatformSettingsView.js';
import { HelpSupportView } from '../arch/pages/HelpSupportView.js';
import { OrganizationsView } from '../arch/pages/OrganizationsView.js';
import { TenantsManagementView } from '../arch/pages/TenantsManagementView.js';
import { ApiKeysView } from '../arch/pages/ApiKeysView.js';
import { IntegrationsWebhooksView } from '../arch/pages/IntegrationsWebhooksView.js';
import { PoliciesTermsView } from '../arch/pages/PoliciesTermsView.js';

// Business Pages
import { AttendanceQueueView } from '../business/attendance/AttendanceQueueView.js';
import { ScheduleView } from '../business/attendance/ScheduleView.js';
import { PatientsView } from '../business/clinical/PatientsView.js';
import { PepView } from '../business/clinical/PepView.js';
import { ConsultationsView } from '../business/clinical/ConsultationsView.js';
import { ProceduresView } from '../business/registries/ProceduresView.js';
import { HealthPlansView } from '../business/registries/HealthPlansView.js';
import { PractitionersView } from '../business/registries/PractitionersView.js';
import { CashFlowView, PayablesReceivablesView, BillingTissView } from '../business/financial/FinancialViews.js';
import { MetricsView } from '../business/management/MetricsView.js';
import { ReportsView } from '../business/management/ReportsView.js';


const ROUTE_TO_TAB: Record<string, string> = {};
const TAB_TO_ROUTE: Record<string, string> = {};

for (const res of APP_RESOURCE_MANIFEST) {
  if (res.route) {
    ROUTE_TO_TAB[res.route] = res.code;
    TAB_TO_ROUTE[res.code] = res.route;
  }
}

export default function DashboardPage() {
  const { locale, t } = useTranslation();
  const { user, claims, error: authError, logout, fetchProfile, hasCapability } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Attendance Permissions
  const canReadOpSchedule = hasCapability('op_schedule', ResourceAction.READ);
  const canReadOpAttendance = hasCapability('op_attendance', ResourceAction.READ);

  // 2. Clinical Permissions
  const canReadOpPatients = hasCapability('op_patients', ResourceAction.READ);
  const canReadOpPep = hasCapability('op_pep', ResourceAction.READ);
  const canReadOpConsultations = hasCapability('op_consultations', ResourceAction.READ);

  // 3. Financial Permissions
  const canReadOpCashflow = hasCapability('op_cashflow', ResourceAction.READ);
  const canReadOpPayables = hasCapability('op_payables', ResourceAction.READ);
  const canReadOpBilling = hasCapability('op_billing', ResourceAction.READ);

  // 4. Base Registries Permissions
  const canReadBaseProcedures = hasCapability('base_procedures', ResourceAction.READ) || hasCapability('op_procedures', ResourceAction.READ);
  const canReadBaseHealthPlans = hasCapability('base_health_plans', ResourceAction.READ);
  const canReadBaseStaff = hasCapability('base_staff', ResourceAction.READ) || hasCapability('op_staff', ResourceAction.READ);

  // 5. Management Permissions (BUSINESS Context)
  const canReadMgmtIndicators = hasCapability('menu_mgmt_indicators', ResourceAction.READ);
  const canReadMgmtReports = hasCapability('menu_mgmt_reports', ResourceAction.READ);

  // 6. System Permissions (ARCH Context)
  const canReadSysSettings = hasCapability('menu_sys_settings', ResourceAction.READ);
  const canReadSysUsers = hasCapability('menu_sys_users', ResourceAction.READ);
  const canReadSysInstitution = hasCapability('menu_sys_institution', ResourceAction.READ);
  const canReadSysAudit = hasCapability('menu_sys_audit', ResourceAction.READ);

  // 7. Platform Permissions (ARCH Context - Exclusive to OWNER)
  const canReadPlatformSettings = hasCapability('menu_platform_settings', ResourceAction.READ);
  const canReadPlatformTenants = hasCapability('menu_platform_tenants', ResourceAction.READ);
  const canReadPlatformApiKeys = hasCapability('menu_platform_api_keys', ResourceAction.READ);
  const canReadPlatformWebhooks = hasCapability('menu_platform_webhooks', ResourceAction.READ);
  const canReadPlatformPolicies = hasCapability('menu_platform_policies', ResourceAction.READ);

  // Determine allowed navigation items
  const allowedNavItems = useMemo(() => {
    const list: string[] = [];
    if (canReadOpSchedule) list.push('op_schedule');
    if (canReadOpAttendance) list.push('op_attendance');
    if (canReadOpPatients) list.push('op_patients');
    if (canReadOpConsultations) list.push('op_consultations');
    if (canReadOpPep) list.push('op_pep');
    if (canReadOpBilling) list.push('op_billing');
    if (canReadOpCashflow) list.push('op_cashflow');
    if (canReadOpPayables) list.push('op_payables');
    if (canReadBaseStaff) list.push('base_staff');
    if (canReadBaseHealthPlans) list.push('base_health_plans');
    if (canReadBaseProcedures) list.push('base_procedures');
    // Management
    if (canReadMgmtIndicators) list.push('menu_mgmt_indicators');
    if (canReadMgmtReports) list.push('menu_mgmt_reports');
    // System
    if (canReadSysSettings) list.push('menu_sys_settings');
    if (canReadSysUsers) list.push('menu_sys_users');
    if (canReadSysInstitution) list.push('menu_sys_institution');
    if (canReadSysAudit) list.push('menu_sys_audit');
    // Platform
    if (canReadPlatformSettings) list.push('menu_platform_settings');
    if (canReadPlatformTenants) list.push('menu_platform_tenants');
    if (canReadPlatformApiKeys) list.push('menu_platform_api_keys');
    if (canReadPlatformWebhooks) list.push('menu_platform_webhooks');
    if (canReadPlatformPolicies) list.push('menu_platform_policies');

    list.push('menu_profile', 'menu_password', 'menu_help');
    return list;
  }, [
    canReadOpSchedule, canReadOpAttendance, canReadOpPatients,
    canReadOpConsultations, canReadOpPep, canReadOpBilling,
    canReadOpCashflow, canReadOpPayables, canReadBaseStaff,
    canReadBaseHealthPlans, canReadBaseProcedures,
    canReadMgmtIndicators, canReadMgmtReports,
    canReadSysSettings, canReadSysUsers, canReadSysInstitution, canReadSysAudit,
    canReadPlatformSettings, canReadPlatformTenants, canReadPlatformApiKeys,
    canReadPlatformWebhooks, canReadPlatformPolicies,
  ]);

  const [activeTab, setActiveTab] = useState<string>('');
  const [, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);

  // ACL Permissions Matrix States
  const [permissionTarget, setPermissionTarget] = useState<PermissionTargetInfo | null>(null);
  const [resourceTree, setResourceTree] = useState<ResourceTreeNode[]>([]);
  const [currentPermissions, setCurrentPermissions] = useState<AclPermissionRecord[]>([]);
  const [inheritedPermissions, setInheritedPermissions] = useState<AclPermissionRecord[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionFeedback, setPermissionFeedback] = useState<{ type: AlertBannerType; msg: string } | null>(null);

  useEffect(() => {
    fetchProfile();
    setMenuLoading(true);
    getMenu()
      .then((res) => {
        const seen = new Set<string>();
        const unique = res.items.filter((item) => {
          if (seen.has(item.item_code)) return false;
          seen.add(item.item_code);
          return true;
        });
        setMenuItems(unique);
      })
      .catch(() => {})
      .finally(() => setMenuLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab && !allowedNavItems.includes(activeTab)) {
      setActiveTab('');
    }
  }, [allowedNavItems, activeTab]);

  // Bidirectional URL and active tab synchronization
  useEffect(() => {
    const currentPath = location.pathname;
    const matchedTab = ROUTE_TO_TAB[currentPath];
    if (matchedTab && allowedNavItems.includes(matchedTab)) {
      if (activeTab !== matchedTab) {
        setActiveTab(matchedTab);
      }
    } else if (currentPath === '/dashboard' || currentPath === '/' || currentPath === '') {
      if (activeTab !== '') {
        setActiveTab('');
      }
    }
  }, [location.pathname, allowedNavItems]);

  const handleSelectTab = (tabKey: string) => {
    setActiveTab(tabKey);
    const targetRoute = TAB_TO_ROUTE[tabKey] || '/dashboard';
    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Open Permissions Modal for User
  const handleOpenUserPermissions = async (u: UserListItem) => {
    setPermissionTarget({
      type: PermissionTargetType.USER,
      id: u.id,
      name: u.full_name || u.username,
      subtitle: u.email || u.username,
      role: u.role as UserRole,
      jobTitle: u.job_title ?? null,
      isOwner: u.role === UserRole.OWNER,
    });
    setPermissionsLoading(true);
    setPermissionFeedback(null);

    try {
      let tree = resourceTree;
      if (tree.length === 0) {
        tree = await getResourceTree();
        setResourceTree(tree);
      }

      const ownAcl = await getUserAcl(u.id);
      setCurrentPermissions(ownAcl || []);

      const inheritedAcl = await getUserInheritedAcl(u.id);
      setInheritedPermissions(inheritedAcl || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      setPermissionFeedback({
        type: AlertBannerType.ERROR,
        msg: t('ERROR_LOAD_PERMISSIONS') + (errMsg ? ` ${errMsg}` : ''),
      });
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Open Permissions Modal for Group
  const handleOpenGroupPermissions = async (g: GroupListItem) => {
    setPermissionTarget({
      type: PermissionTargetType.GROUP,
      id: g.id,
      name: g.name,
      subtitle: g.description || t('GROUP_DEFAULT_SUBTITLE'),
    });
    setPermissionsLoading(true);
    setPermissionFeedback(null);

    try {
      let tree = resourceTree;
      if (tree.length === 0) {
        tree = await getResourceTree();
        setResourceTree(tree);
      }

      const groupAcl = await getGroupAcl(g.id);
      setCurrentPermissions(groupAcl || []);
      setInheritedPermissions([]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      setPermissionFeedback({
        type: AlertBannerType.ERROR,
        msg: t('ERROR_LOAD_PERMISSIONS') + (errMsg ? ` ${errMsg}` : ''),
      });
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Save Matrix Permissions
  const handleSavePermissions = async (newPermissions: AclPermissionRecord[]) => {
    if (!permissionTarget) return;
    setPermissionsSaving(true);
    setPermissionFeedback(null);

    try {
      await syncPermissions({
        user_id: permissionTarget.type === PermissionTargetType.USER ? permissionTarget.id : undefined,
        group_id: permissionTarget.type === PermissionTargetType.GROUP ? permissionTarget.id : undefined,
        permissions: newPermissions.map((p) => ({
          resource_key: p.resource_key,
          actions: p.actions,
          effect: p.effect,
        })),
      });

      setPermissionFeedback({
        type: AlertBannerType.SUCCESS,
        msg: t('PERMISSIONS_SAVED_SUCCESS'),
      });
      fetchProfile();
      setTimeout(() => {
        setPermissionTarget(null);
      }, 1000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      setPermissionFeedback({
        type: AlertBannerType.ERROR,
        msg: t('ERROR_SYNC_PERMISSIONS') + (errMsg ? ` ${errMsg}` : ''),
      });
    } finally {
      setPermissionsSaving(false);
    }
  };

  // Dynamic Active Content Rendering
  const renderActiveContent = () => {
    switch (activeTab) {
      // 1. Attendance
      case 'op_attendance':
        return <AttendanceQueueView />;
      case 'op_schedule':
        return <ScheduleView />;

      // 2. Clinical
      case 'op_patients':
        return <PatientsView />;
      case 'op_pep':
        return <PepView />;
      case 'op_consultations':
        return <ConsultationsView />;

      // 3. Financial
      case 'op_cashflow':
        return <CashFlowView />;
      case 'op_payables':
        return <PayablesReceivablesView />;
      case 'op_billing':
        return <BillingTissView />;

      // 4. Registries
      case 'base_procedures':
      case 'op_procedures':
        return <ProceduresView />;
      case 'base_health_plans':
        return <HealthPlansView />;
      case 'base_staff':
      case 'op_staff':
      case 'base_collaborators':
      case 'op_collaborators':
        return <PractitionersView />;

      // 5. Profile & Security
      case 'menu_profile':
        return <ProfileView user={user} />;
      case 'menu_password':
        return <SecurityView />;

      // 6. Management (BUSINESS Context)
      case 'menu_mgmt_indicators':
        return <MetricsView />;
      case 'menu_mgmt_reports':
        return <ReportsView />;

      // 7. System (ARCH Context)
      case 'menu_sys_settings':
        return <ApplicationSettingsView />;
      case 'menu_sys_users':
        return (
          <UsersManagementView
            currentUser={user}
            onOpenUserPermissions={handleOpenUserPermissions}
            onOpenGroupPermissions={handleOpenGroupPermissions}
            onProfileUpdated={fetchProfile}
          />
        );
      case 'menu_sys_institution':
      case 'menu_sys_organization':
        return <OrganizationsView />;
      case 'menu_sys_audit':
        return <AuditLogsView user={user} />;

      // 8. Platform (ARCH Context - Exclusive to OWNER)
      case 'menu_platform_settings':
        return <PlatformSettingsView />;
      case 'menu_platform_tenants':
        return <TenantsManagementView onNavigateTab={handleSelectTab} />;
      case 'menu_platform_api_keys':
        return <ApiKeysView />;
      case 'menu_platform_webhooks':
        return <IntegrationsWebhooksView />;
      case 'menu_platform_policies':
        return <PoliciesTermsView />;

      // 9. Help
      case 'menu_help':
        return <HelpSupportView />;

      default:
        return (
          <div style={{ padding: '24px 28px', maxWidth: 1060, margin: '0 auto' }}>
            {/* Header Card de Boas-Vindas */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: 14,
              padding: '24px 28px',
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
              marginBottom: 24,
              border: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  {t('DASHBOARD_WELCOME_SUBTITLE')}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                  {t('DASHBOARD_WELCOME_USER', { name: user?.full_name || user?.username || '' })}
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {user?.job_title && (
                    <span style={{ color: '#bae6fd', fontWeight: 500 }}>💼 {user.job_title}</span>
                  )}
                  <span>•</span>
                  <span>{t('DASHBOARD_UNIT_LABEL')} <strong style={{ color: '#f8fafc' }}>{t('DASHBOARD_UNIT_MAIN')}</strong></span>
                  <span>•</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: 'rgba(2, 132, 199, 0.25)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    textTransform: 'uppercase',
                  }}>
                    {user?.role ?? 'USER'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Access to Primary Modules */}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              {t('DASHBOARD_SHORTCUTS_TITLE')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {canReadOpSchedule && (
                <div
                  onClick={() => handleSelectTab('op_schedule')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📅</div>
                  <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#0f172a' }}>{t('DASHBOARD_SCHEDULE_TITLE')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>{t('DASHBOARD_SCHEDULE_DESC')}</div>
                </div>
              )}

              {canReadOpAttendance && (
                <div
                  onClick={() => handleSelectTab('op_attendance')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📋</div>
                  <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#0f172a' }}>{t('DASHBOARD_QUEUE_TITLE')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>{t('DASHBOARD_QUEUE_DESC')}</div>
                </div>
              )}

              {canReadOpPatients && (
                <div
                  onClick={() => handleSelectTab('op_patients')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>🧑‍🤝‍🧑</div>
                  <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#0f172a' }}>{t('DASHBOARD_PATIENTS_TITLE')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>{t('DASHBOARD_PATIENTS_DESC')}</div>
                </div>
              )}

              {canReadBaseStaff && (
                <div
                  onClick={() => handleSelectTab('base_staff')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>🩺</div>
                  <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#0f172a' }}>{t('DASHBOARD_CLINICAL_TITLE')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>{t('DASHBOARD_CLINICAL_DESC')}</div>
                </div>
              )}

              {canReadSysUsers && (
                <div
                  onClick={() => handleSelectTab('menu_sys_users')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>👥</div>
                  <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#0f172a' }}>{t('DASHBOARD_USERS_TITLE')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>{t('DASHBOARD_USERS_DESC')}</div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <MainLayout
        key={locale}
        user={user}
        claims={claims}
        authError={authError}
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        menuLoading={menuLoading}
        onLogout={handleLogout}
        onSelectTab={handleSelectTab}
        canReadProfile={true}
        canReadPassword={true}
        canReadHelp={true}
        canReadOpSchedule={canReadOpSchedule}
        canReadOpAttendance={canReadOpAttendance}
        canReadOpPatients={canReadOpPatients}
        canReadOpPep={canReadOpPep}
        canReadOpConsultations={canReadOpConsultations}
        canReadOpCashflow={canReadOpCashflow}
        canReadOpPayables={canReadOpPayables}
        canReadOpBilling={canReadOpBilling}
        canReadBaseProcedures={canReadBaseProcedures}
        canReadBaseHealthPlans={canReadBaseHealthPlans}
        canReadBaseStaff={canReadBaseStaff}
        canReadMgmtIndicators={canReadMgmtIndicators}
        canReadMgmtReports={canReadMgmtReports}
        canReadSysSettings={canReadSysSettings}
        canReadSysUsers={canReadSysUsers}
        canReadSysInstitution={canReadSysInstitution}
        canReadSysAudit={canReadSysAudit}
        canReadPlatformSettings={canReadPlatformSettings}
        canReadPlatformTenants={canReadPlatformTenants}
        canReadPlatformApiKeys={canReadPlatformApiKeys}
        canReadPlatformWebhooks={canReadPlatformWebhooks}
        canReadPlatformPolicies={canReadPlatformPolicies}
      >
        {authError && (
          <AlertBanner
            type={AlertBannerType.ERROR}
            message={authError}
            onClose={() => {}}
          />
        )}
        {renderActiveContent()}
      </MainLayout>

      {/* ACL Permissions Matrix Modal */}
      {permissionTarget && (
        <PermissionsMatrixModal
          permissionTarget={permissionTarget}
          resourceTree={resourceTree}
          initialPermissions={currentPermissions}
          inheritedPermissions={inheritedPermissions}
          permissionsLoading={permissionsLoading}
          permissionsSaving={permissionsSaving}
          feedback={permissionFeedback}
          onClose={() => setPermissionTarget(null)}
          onSave={handleSavePermissions}
          isOperatorOwner={user?.role === UserRole.OWNER}
        />
      )}
    </>
  );
}

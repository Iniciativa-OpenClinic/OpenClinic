import React, { useState, useEffect } from 'react';
import { t, useI18n } from '../../i18n/index.js';
import logoImg from '../../assets/logo.png';
import { useConfig } from '../../context/ConfigContext.js';


export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  menuLoading: boolean;
  canReadOpSchedule: boolean;
  canReadOpAttendance: boolean;
  canReadOpPatients: boolean;
  canReadOpPep: boolean;
  canReadOpConsultations: boolean;
  canReadOpCashflow: boolean;
  canReadOpPayables: boolean;
  canReadOpBilling: boolean;
  canReadBaseProcedures: boolean;
  canReadBaseHealthPlans: boolean;
  canReadBaseStaff: boolean;
  // Management
  canReadMgmtIndicators?: boolean;
  canReadMgmtReports?: boolean;
  // System
  canReadSysSettings?: boolean;
  canReadSysUsers?: boolean;
  canReadSysInstitution?: boolean;
  canReadSysAudit?: boolean;
  // Platform (Owner)
  canReadPlatformSettings?: boolean;
  canReadPlatformTenants?: boolean;
  canReadPlatformApiKeys?: boolean;
  canReadPlatformWebhooks?: boolean;
  canReadPlatformPolicies?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  menuLoading,
  canReadOpSchedule,
  canReadOpAttendance,
  canReadOpPatients,
  canReadOpPep,
  canReadOpConsultations,
  canReadOpCashflow,
  canReadOpPayables,
  canReadOpBilling,
  canReadBaseProcedures,
  canReadBaseHealthPlans,
  canReadBaseStaff,
  canReadMgmtIndicators,
  canReadMgmtReports,
  canReadSysSettings,
  canReadSysUsers,
  canReadSysInstitution,
  canReadSysAudit,
  canReadPlatformSettings,
  canReadPlatformTenants,
  canReadPlatformApiKeys,
  canReadPlatformWebhooks,
  canReadPlatformPolicies,
}) => {
  const { locale } = useI18n();
  const { appVersion } = useConfig();

  // Sidebar Accordions State (Initially opens authorized sections)
  const [openSidebarSections, setOpenSidebarSections] = useState<Set<string>>(new Set());

  const toggleSidebarSection = (sectionKey: string) => {
    setOpenSidebarSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  const hasAttendanceSection = canReadOpSchedule || canReadOpAttendance;
  const hasClinicalSection = canReadOpPatients || canReadOpPep || canReadOpConsultations;
  const hasFinancialSection = canReadOpCashflow || canReadOpPayables || canReadOpBilling;
  const hasRegistriesSection = canReadBaseProcedures || canReadBaseHealthPlans || canReadBaseStaff;
  
  // Management (BUSINESS)
  const hasMgmtIndicators = !!canReadMgmtIndicators;
  const hasMgmtReports = !!canReadMgmtReports;
  const hasManagementSection = hasMgmtIndicators || hasMgmtReports;

  // System (ARCH)
  const hasSysSettings = !!canReadSysSettings;
  const hasSysUsers = !!canReadSysUsers;
  const hasSysInstitution = !!canReadSysInstitution;
  const hasSysAudit = !!canReadSysAudit;
  const hasSystemSection = hasSysSettings || hasSysUsers || hasSysInstitution || hasSysAudit;

  // Platform (ARCH - Owner)
  const hasPlatformSettings = !!canReadPlatformSettings;
  const hasPlatformTenants = !!canReadPlatformTenants;
  const hasPlatformApiKeys = !!canReadPlatformApiKeys;
  const hasPlatformWebhooks = !!canReadPlatformWebhooks;
  const hasPlatformPolicies = !!canReadPlatformPolicies;
  const hasPlatformSection = hasPlatformSettings || hasPlatformTenants || hasPlatformApiKeys || hasPlatformWebhooks || hasPlatformPolicies;

  // Sidebar sections start collapsed by default. Expansion is performed on demand by the user.

  // Ensures that upon tab switch or activation, the corresponding section is opened
  useEffect(() => {
    if (!activeTab) return;
    if (activeTab === 'op_schedule' || activeTab === 'op_attendance') {
      setOpenSidebarSections((prev) => new Set(prev).add('attendance'));
    } else if (activeTab === 'op_patients' || activeTab === 'op_consultations' || activeTab === 'op_pep') {
      setOpenSidebarSections((prev) => new Set(prev).add('clinical'));
    } else if (activeTab === 'op_billing' || activeTab === 'op_cashflow' || activeTab === 'op_payables') {
      setOpenSidebarSections((prev) => new Set(prev).add('financial'));
    } else if (activeTab === 'base_staff' || activeTab === 'base_health_plans' || activeTab === 'base_procedures') {
      setOpenSidebarSections((prev) => new Set(prev).add('registries'));
    } else if (activeTab === 'menu_mgmt_indicators' || activeTab === 'menu_mgmt_reports') {
      setOpenSidebarSections((prev) => new Set(prev).add('management'));
    } else if (activeTab === 'menu_sys_settings' || activeTab === 'menu_sys_users' || activeTab === 'menu_sys_institution' || activeTab === 'menu_sys_audit') {
      setOpenSidebarSections((prev) => new Set(prev).add('system'));
    } else if (activeTab === 'menu_platform_settings' || activeTab === 'menu_platform_tenants' || activeTab === 'menu_platform_api_keys' || activeTab === 'menu_platform_webhooks' || activeTab === 'menu_platform_policies') {
      setOpenSidebarSections((prev) => new Set(prev).add('platform'));
    }
  }, [activeTab]);

  const renderSidebarNavItem = (
    tabKey: string,
    label: string,
    canAccess: boolean
  ) => {
    if (!canAccess) return null;
    const isActive = activeTab === tabKey;
    return (
      <button
        key={tabKey}
        type="button"
        onClick={() => setActiveTab(tabKey)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 10px',
          borderRadius: 6,
          background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
          color: isActive ? '#38bdf8' : '#94a3b8',
          fontWeight: isActive ? 600 : 400,
          border: 'none',
          textAlign: 'left',
          fontSize: '0.81rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => {
          if (activeTab !== tabKey) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#f1f5f9';
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== tabKey) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: isActive ? '#38bdf8' : '#475569',
            display: 'inline-block',
            flexShrink: 0,
            transition: 'background 0.15s ease',
          }}
        />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </button>
    );
  };

  const renderAccordionSection = (
    sectionKey: string,
    icon: string,
    title: string,
    isVisible: boolean,
    children: React.ReactNode
  ) => {
    if (!isVisible) return null;
    const isOpen = openSidebarSections.has(sectionKey);

    return (
      <div key={sectionKey} style={{ display: 'flex', flexDirection: 'column' }}>
        <button
          type="button"
          onClick={() => toggleSidebarSection(sectionKey)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 9px',
            borderRadius: 7,
            background: isOpen ? 'rgba(30, 41, 59, 0.85)' : 'rgba(30, 41, 59, 0.4)',
            border: isOpen ? '1px solid #334155' : '1px solid rgba(51, 65, 85, 0.4)',
            color: isOpen ? '#f8fafc' : '#cbd5e1',
            fontSize: '0.70rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxSizing: 'border-box',
            textAlign: 'left',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = 'rgba(51, 65, 85, 0.6)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)';
              e.currentTarget.style.color = '#cbd5e1';
              e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.4)';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span
              style={{
                width: 20,
                height: 20,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                borderRadius: 4,
                background: isOpen ? 'rgba(2, 132, 199, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                border: isOpen ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          </div>
          <span
            style={{
              fontSize: '0.62rem',
              color: isOpen ? '#38bdf8' : '#64748b',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.15s ease',
              marginLeft: 4,
            }}
          >
            ▼
          </span>
        </button>

        {isOpen && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              marginTop: 4,
              marginBottom: 6,
              marginLeft: 10,
              paddingLeft: 8,
              borderLeft: '1.5px solid rgba(51, 65, 85, 0.6)',
            }}
          >
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      style={{
        width: 285,
        minWidth: 285,
        maxWidth: 285,
        background: '#0f172a',
        color: '#f8fafc',
        padding: '16px 14px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRight: '1px solid #1e293b',
      }}
    >
      {/* Brand Header */}
      <div
        onClick={() => setActiveTab('')}
        title={t('SYSTEM_TAGLINE')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingBottom: 14,
          borderBottom: '1px solid #334155',
          marginBottom: 12,
          flexShrink: 0,
          cursor: 'pointer',
          userSelect: 'none',
          borderRadius: 8,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        <img
          src={logoImg}
          alt="OpenClinic Logo"
          style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 8, background: '#1e293b', padding: 2 }}
          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
        />
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.28rem', letterSpacing: '-0.025em', color: '#f8fafc', lineHeight: 1.15 }}>OpenClinic</div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>
            {t('SYSTEM_TAGLINE')}
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav
        className="sidebar-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          minHeight: 0,
        }}
      >
        {/* 1. ATENDIMENTO */}
        {renderAccordionSection(
          'attendance',
          '📋',
          t('NAV_SECTION_ATTENDANCE'),
          hasAttendanceSection,
          <>
            {renderSidebarNavItem('op_schedule', t('NAV_ATTENDANCE_SCHEDULE'), canReadOpSchedule)}
            {renderSidebarNavItem('op_attendance', t('NAV_ATTENDANCE_QUEUE'), canReadOpAttendance)}
          </>
        )}

        {/* 2. CLINICAL */}
        {renderAccordionSection(
          'clinical',
          '🩺',
          t('NAV_SECTION_CLINICAL'),
          hasClinicalSection,
          <>
            {renderSidebarNavItem('op_patients', t('NAV_CLINICAL_PATIENTS'), canReadOpPatients)}
            {renderSidebarNavItem('op_consultations', t('NAV_CLINICAL_CONSULTATIONS'), canReadOpConsultations)}
            {renderSidebarNavItem('op_pep', t('NAV_CLINICAL_PEP'), canReadOpPep)}
          </>
        )}

        {/* 3. FINANCEIRO */}
        {renderAccordionSection(
          'financial',
          '💰',
          t('NAV_SECTION_FINANCIAL'),
          hasFinancialSection,
          <>
            {renderSidebarNavItem('op_billing', t('NAV_FINANCIAL_BILLING'), canReadOpBilling)}
            {renderSidebarNavItem('op_cashflow', t('NAV_FINANCIAL_CASHFLOW'), canReadOpCashflow)}
            {renderSidebarNavItem('op_payables', t('NAV_FINANCIAL_PAYABLES'), canReadOpPayables)}
          </>
        )}

        {/* 4. CADASTROS */}
        {renderAccordionSection(
          'registries',
          '🏢',
          t('NAV_SECTION_BASE_REGISTRIES'),
          hasRegistriesSection,
          <>
            {renderSidebarNavItem('base_staff', t('NAV_BASE_STAFF'), canReadBaseStaff)}
            {renderSidebarNavItem('base_health_plans', t('NAV_BASE_HEALTH_PLANS'), canReadBaseHealthPlans)}
            {renderSidebarNavItem('base_procedures', t('NAV_BASE_PROCEDURES'), canReadBaseProcedures)}
          </>
        )}

        {/* 5. MANAGEMENT */}
        {renderAccordionSection(
          'management',
          '📊',
          t('NAV_SECTION_MANAGEMENT'),
          hasManagementSection,
          <>
            {renderSidebarNavItem('menu_mgmt_indicators', t('NAV_MGMT_INDICATORS'), hasMgmtIndicators)}
            {renderSidebarNavItem('menu_mgmt_reports', t('NAV_MGMT_REPORTS'), hasMgmtReports)}
          </>
        )}

        {/* 6. SISTEMA */}
        {renderAccordionSection(
          'system',
          '⚙️',
          t('NAV_SECTION_SYSTEM'),
          hasSystemSection,
          <>
            {renderSidebarNavItem('menu_sys_settings', t('NAV_SYS_SETTINGS'), hasSysSettings)}
            {renderSidebarNavItem('menu_sys_users', t('NAV_SYS_USERS'), hasSysUsers)}
            {renderSidebarNavItem('menu_sys_institution', t('NAV_SYS_INSTITUTION'), hasSysInstitution)}
            {renderSidebarNavItem('menu_sys_audit', t('NAV_SYS_AUDIT'), hasSysAudit)}
          </>
        )}

        {/* 7. PLATAFORMA (Exclusivo: Owner / Mantenedor) */}
        {renderAccordionSection(
          'platform',
          '🛠️',
          t('NAV_SECTION_PLATFORM'),
          hasPlatformSection,
          <>
            {renderSidebarNavItem('menu_platform_settings', t('NAV_PLATFORM_SETTINGS'), hasPlatformSettings)}
            {renderSidebarNavItem('menu_platform_tenants', t('NAV_PLATFORM_TENANTS'), hasPlatformTenants)}
            {renderSidebarNavItem('menu_platform_api_keys', t('NAV_PLATFORM_API_KEYS'), hasPlatformApiKeys)}
            {renderSidebarNavItem('menu_platform_webhooks', t('NAV_PLATFORM_WEBHOOKS'), hasPlatformWebhooks)}
            {renderSidebarNavItem('menu_platform_policies', t('NAV_PLATFORM_POLICIES'), hasPlatformPolicies)}
          </>
        )}

        {menuLoading && <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '8px 12px' }}>{t('MENUS_LOADING')}</div>}
      </nav>

      {/* Sidebar Footer: System Version */}
      <div style={{ borderTop: '1px solid #334155', paddingTop: 12, marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 4, paddingRight: 4, flexShrink: 0 }}>
        <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {t('SYSTEM_VERSION_LABEL')}
        </span>
        <span
          style={{
            fontSize: '0.70rem',
            color: '#38bdf8',
            fontFamily: 'monospace',
            fontWeight: 700,
            background: 'rgba(2, 132, 199, 0.12)',
            padding: '2px 8px',
            borderRadius: 6,
            border: '1px solid rgba(56, 189, 248, 0.25)',
            letterSpacing: '0.03em',
          }}
        >
          {appVersion ? `v${appVersion.replace(/^v/, '')}` : '—'}
        </span>
      </div>
    </aside>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { t, useI18n, getLocaleMetadata, type SupportedLocale } from '../../i18n/index.js';
import type { UserProfile } from '../../types/auth.js';

export interface HeaderProps {
  activeTab: string;
  user: UserProfile | null;
  canReadProfile: boolean;
  canReadPassword: boolean;
  canReadHelp: boolean;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  user,
  canReadProfile,
  canReadPassword,
  canReadHelp,
  onSelectTab,
  onLogout,
}) => {
  const { locale, setLocale, supportedLocales } = useI18n();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const roleBadgeColor = {
    OWNER: { bg: 'rgba(217, 119, 6, 0.12)', text: '#b45309', border: 'rgba(217, 119, 6, 0.25)' },
    ADMIN: { bg: 'rgba(99, 102, 241, 0.12)', text: '#4338ca', border: 'rgba(99, 102, 241, 0.25)' },
    USER: { bg: 'rgba(148, 163, 184, 0.15)', text: '#475569', border: 'rgba(148, 163, 184, 0.30)' },
  }[user?.role ?? 'USER'];

  const cleanDisplayName = (user?.full_name ?? user?.display_name ?? t('LABEL_USER_DEFAULT')).replace(/\s*\((Owner|Admin|User)\)/gi, '');

  const getActiveTabTitle = (): string => {
    switch (activeTab) {
      case 'op_schedule': return t('NAV_ATTENDANCE_SCHEDULE');
      case 'op_attendance': return t('NAV_ATTENDANCE_QUEUE');
      case 'op_patients': return t('NAV_CLINICAL_PATIENTS');
      case 'op_pep': return t('NAV_CLINICAL_PEP');
      case 'op_consultations': return t('NAV_CLINICAL_CONSULTATIONS');
      case 'op_cashflow': return t('NAV_FINANCIAL_CASHFLOW');
      case 'op_payables': return t('NAV_FINANCIAL_PAYABLES');
      case 'op_billing': return t('NAV_FINANCIAL_BILLING');
      case 'base_procedures': return t('NAV_BASE_PROCEDURES');
      case 'base_health_plans': return t('NAV_BASE_HEALTH_PLANS');
      case 'base_staff': return t('NAV_BASE_STAFF');
      case 'menu_profile': return t('USER_MENU_PROFILE');
      case 'menu_password': return t('USER_MENU_SECURITY');
      case 'menu_help': return t('USER_MENU_HELP');
      // Management
      case 'menu_mgmt_indicators': return t('NAV_MGMT_INDICATORS');
      case 'menu_mgmt_reports': return t('NAV_MGMT_REPORTS');
      // System
      case 'menu_sys_settings': return t('NAV_SYS_SETTINGS');
      case 'menu_sys_users': return t('NAV_SYS_USERS');
      case 'menu_sys_institution': return t('NAV_SYS_INSTITUTION');
      case 'menu_sys_audit': return t('NAV_SYS_AUDIT');
      // Platform
      case 'menu_platform_settings': return t('NAV_PLATFORM_SETTINGS');
      case 'menu_platform_tenants': return t('NAV_PLATFORM_TENANTS');
      case 'menu_platform_api_keys': return t('NAV_PLATFORM_API_KEYS');
      case 'menu_platform_webhooks': return t('NAV_PLATFORM_WEBHOOKS');
      case 'menu_platform_policies': return t('NAV_PLATFORM_POLICIES');
      default: return activeTab;
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 700 }}>
          {getActiveTabTitle()}
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
          {t('DASHBOARD_SUBTITLE')}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Unified Container: User Profile + Integrated Language Selector on the Right */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: isUserMenuOpen ? '#f0f9ff' : '#f8fafc',
              padding: '4px 6px 4px 6px',
              borderRadius: 10,
              border: isUserMenuOpen ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
              boxShadow: isUserMenuOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.06)',
              transition: 'all 0.15s ease',
              gap: 10,
            }}
          >
            {/* User Profile Trigger Button */}
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                border: 'none',
                padding: '4px 8px 4px 4px',
                borderRadius: 7,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(2, 132, 199, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Avatar Icon */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.96rem',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                }}
              >
                {cleanDisplayName.charAt(0).toUpperCase()}
              </div>

              <div style={{ textAlign: 'left', marginRight: 4 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                  {cleanDisplayName}
                </div>
                {user?.job_title && (
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748b',
                      fontWeight: 500,
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: 2,
                    }}
                    title={user.job_title}
                  >
                    {user.job_title}
                  </div>
                )}
              </div>

              <span
                style={{
                  fontSize: '0.68rem',
                  color: isUserMenuOpen ? '#0284c7' : '#64748b',
                  transform: isUserMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  marginLeft: 4,
                }}
              >
                ▼
              </span>
            </button>

            {/* Integrated Language Selector on the Right of User Profile (Visible when multiple languages are active) */}
            {supportedLocales && supportedLocales.length > 1 && (
              <>
                <div style={{ width: 1, height: 32, background: '#cbd5e1', flexShrink: 0 }} />
                <div
                  title={t('LANG_SELECTOR')}
                  aria-label={t('LANG_SELECTOR')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#ffffff',
                    borderRadius: 8,
                    padding: 3,
                    border: '1px solid #e2e8f0',
                    gap: 2,
                    flexShrink: 0,
                  }}
                >
                  {supportedLocales.map((loc) => {
                    const isSelected = locale === loc;
                    const meta = getLocaleMetadata(loc);
                    const flag = meta.flag;
                    const shortLabel = meta.shortLabel;
                    const langTitle = meta.nativeName;

                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocale(loc as SupportedLocale);
                        }}
                        title={langTitle}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: 'none',
                          background: isSelected ? '#e0f2fe' : 'transparent',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#0284c7' : '#64748b',
                          boxShadow: isSelected ? '0 1px 2px rgba(2, 132, 199, 0.12)' : 'none',
                          cursor: 'pointer',
                          fontSize: '0.76rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '0.85rem' }}>{flag}</span>
                        <span>{shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        {/* Dropdown Menu */}
        {isUserMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 250,
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
              padding: '6px',
              zIndex: 100,
            }}
          >
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cleanDisplayName}
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: roleBadgeColor.bg,
                    color: roleBadgeColor.text,
                    border: `1px solid ${roleBadgeColor.border}`,
                    padding: '2px 7px',
                    borderRadius: 10,
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                >
                  {user?.role ?? 'USER'}
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.username}
              </div>
              {user?.email && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={user.email}
                >
                  {user.email}
                </div>
              )}
            </div>

            {canReadProfile && (
              <button
                type="button"
                onClick={() => {
                  onSelectTab('menu_profile');
                  setIsUserMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: activeTab === 'menu_profile' ? '#f0f9ff' : 'transparent',
                  color: activeTab === 'menu_profile' ? '#0284c7' : '#334155',
                  fontWeight: activeTab === 'menu_profile' ? 600 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>👤</span> {t('USER_MENU_PROFILE')}
              </button>
            )}

            {canReadPassword && (
              <button
                type="button"
                onClick={() => {
                  onSelectTab('menu_password');
                  setIsUserMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: activeTab === 'menu_password' ? '#f0f9ff' : 'transparent',
                  color: activeTab === 'menu_password' ? '#0284c7' : '#334155',
                  fontWeight: activeTab === 'menu_password' ? 600 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>🔒</span> {t('USER_MENU_SECURITY')}
              </button>
            )}

            {canReadHelp && (
              <button
                type="button"
                onClick={() => {
                  onSelectTab('menu_help');
                  setIsUserMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: activeTab === 'menu_help' ? '#f0f9ff' : 'transparent',
                  color: activeTab === 'menu_help' ? '#0284c7' : '#334155',
                  fontWeight: activeTab === 'menu_help' ? 600 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>❓</span> {t('USER_MENU_HELP')}
              </button>
            )}

            <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />

            <button
              type="button"
              onClick={() => {
                setIsUserMenuOpen(false);
                onLogout();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: '#dc2626',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>🚪</span> {t('BTN_LOGOUT')}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

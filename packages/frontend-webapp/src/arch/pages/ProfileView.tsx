import React from 'react';
import type { UserProfile } from '../../types/auth.js';
import { useI18n } from '../../i18n/index.js';

export interface ProfileViewProps {
  user: UserProfile | null;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const { t } = useI18n();
  if (!user) return null;

  const cleanDisplayName = (user.full_name ?? user.display_name ?? t('LABEL_USER_DEFAULT')).replace(/\s*\((Owner|Admin|User)\)/gi, '');

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#f8fafc',
    color: '#334155',
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, maxWidth: 760 }}>
      <h3 style={{ margin: '0 0 18px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>{t('PROFILE_TITLE')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Row 1: Full Name and Job Title / Role */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_FULL_NAME')}</label>
            <input type="text" value={cleanDisplayName} disabled style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_JOB_TITLE')}</label>
            <input type="text" value={user.job_title || t('LABEL_NOT_INFORMED')} disabled style={inputStyle} />
          </div>
        </div>

        {/* Row 2: Username, Email, and Access Role */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_USERNAME')}</label>
            <input type="text" value={user.username} disabled style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_EMAIL')}</label>
            <input type="text" value={user.email} disabled style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_ROLE')}</label>
            <input type="text" value={user.role} disabled style={{ ...inputStyle, fontWeight: 700, color: '#0284c7' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

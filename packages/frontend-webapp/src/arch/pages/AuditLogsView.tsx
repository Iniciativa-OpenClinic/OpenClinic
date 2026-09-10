import React from 'react';
import type { UserProfile } from '../../types/auth.js';
import { useI18n } from '../../i18n/index.js';

export interface AuditLogsViewProps {
  user: UserProfile | null;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ user }) => {
  const { t } = useI18n();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>{t('AUDIT_LOGS_TITLE')}</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>{t('AUDIT_LOGS_SUBTITLE')}</p>
          </div>
          <button style={{ padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            📥 {t('BTN_EXPORT_AUDIT_REPORT')}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>{t('TABLE_HEADER_DATETIME')}</th>
                <th style={{ padding: '10px 14px' }}>{t('GLOBAL_LABEL_USERNAME')}</th>
                <th style={{ padding: '10px 14px' }}>{t('TABLE_HEADER_ACTION_EVENT')}</th>
                <th style={{ padding: '10px 14px' }}>{t('TABLE_HEADER_RESOURCE')}</th>
                <th style={{ padding: '10px 14px' }}>{t('TABLE_HEADER_IP_ADDRESS')}</th>
                <th style={{ padding: '10px 14px' }}>{t('TABLE_HEADER_RESULT')}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8rem' }}>30/08/2026 11:20:04</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>{user?.username ?? 'admin'}</td>
                <td style={{ padding: '12px 14px' }}><span style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>IAM_ACL_SYNC</span></td>
                <td style={{ padding: '12px 14px', color: '#334155' }}>sys_application_resources</td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>127.0.0.1</td>
                <td style={{ padding: '12px 14px' }}><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{t('STATUS_SUCCESS')}</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8rem' }}>30/08/2026 11:15:32</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>dr.carlos</td>
                <td style={{ padding: '12px 14px' }}><span style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>PEP_READ_EVOLUTION</span></td>
                <td style={{ padding: '12px 14px', color: '#334155' }}>pep_anamnese (Pac: 12345)</td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>192.168.1.45</td>
                <td style={{ padding: '12px 14px' }}><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{t('STATUS_SUCCESS')}</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8rem' }}>30/08/2026 10:45:10</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>unknown</td>
                <td style={{ padding: '12px 14px' }}><span style={{ fontFamily: 'monospace', color: '#dc2626', fontWeight: 700 }}>AUTH_LOGIN_FAILED</span></td>
                <td style={{ padding: '12px 14px', color: '#334155' }}>api/v1/auth/login</td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>189.44.12.98</td>
                <td style={{ padding: '12px 14px' }}><span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{t('STATUS_BLOCKED')}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

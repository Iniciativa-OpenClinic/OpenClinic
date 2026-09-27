import React from 'react';
import { useI18n } from '../../i18n/index.js';
import { MockDataBanner } from '../../components/MockDataBanner.js';

export const PoliciesTermsView: React.FC = () => {
  const { t } = useI18n();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <MockDataBanner />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
          📜 {t('NAV_PLATFORM_POLICIES')}
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#64748b' }}>
          {t('POLICIES_SUBTITLE')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>
              📄 {t('POLICIES_TERMS_OF_USE')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              {t('POLICIES_TERMS_DESC')}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600, cursor: 'pointer' }}>
              {t('POLICIES_VIEW_DOC')}
            </span>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>
              🛡️ {t('POLICIES_PRIVACY_POLICY')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              {t('POLICIES_PRIVACY_DESC')}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600, cursor: 'pointer' }}>
              {t('POLICIES_VIEW_DOC')}
            </span>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>
              🤝 {t('POLICIES_DPA_TITLE')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              {t('POLICIES_DPA_DESC')}
            </div>
            <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600, cursor: 'pointer' }}>
              {t('POLICIES_VIEW_DOC')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

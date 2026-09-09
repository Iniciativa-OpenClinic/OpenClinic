import React from 'react';
import { useI18n } from '../../i18n/index.js';

export const MetricsView: React.FC = () => {
  const { t } = useI18n();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('METRICS_WAIT_TIME_TITLE')}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>12.4 min</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 2 }}>{t('METRICS_WAIT_TIME_TARGET')}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('METRICS_OCCUPANCY_TITLE')}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>84.5%</div>
          <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: 2 }}>{t('METRICS_OCCUPANCY_SUBTITLE')}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('METRICS_NPS_TITLE')}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>96.8</div>
          <div style={{ fontSize: '0.72rem', color: '#8b5cf6', marginTop: 2 }}>{t('METRICS_NPS_SUBTITLE')}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t('METRICS_BILLING_GLOSS_TITLE')}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>0.8%</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 2 }}>{t('METRICS_BILLING_GLOSS_SUBTITLE')}</div>
        </div>
      </div>
    </div>
  );
};

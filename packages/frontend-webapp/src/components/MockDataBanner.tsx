import React from 'react';
import { useTranslation } from '../i18n/index.js';

export interface MockDataBannerProps {
  customMessage?: string;
  style?: React.CSSProperties;
}

export const MockDataBanner: React.FC<MockDataBannerProps> = ({ customMessage, style }) => {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'linear-gradient(90deg, #b91c1c 0%, #991b1b 100%)',
        color: '#ffffff',
        border: '1px solid #ef4444',
        borderRadius: 10,
        padding: '12px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: '0 4px 14px rgba(185, 28, 28, 0.28)',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
        <div
          style={{
            fontSize: '1.35rem',
            lineHeight: 1,
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '6px 8px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ⚠️
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.90rem', letterSpacing: '-0.01em', color: '#ffffff' }}>
            {t('MOCK_DATA_BANNER_TITLE')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#fee2e2', marginTop: 2, lineHeight: 1.4, fontWeight: 500 }}>
            {customMessage || t('MOCK_DATA_BANNER_DESC')}
          </div>
        </div>
      </div>
      <span
        style={{
          background: 'rgba(255, 255, 255, 0.22)',
          border: '1px solid rgba(255, 255, 255, 0.45)',
          color: '#ffffff',
          fontSize: '0.70rem',
          fontWeight: 800,
          letterSpacing: '0.06em',
          padding: '4px 10px',
          borderRadius: 6,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {t('MOCK_DATA_BANNER_BADGE')}
      </span>
    </div>
  );
};

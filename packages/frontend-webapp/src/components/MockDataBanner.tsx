import React from 'react';
import { useTranslation } from '../i18n/index.js';

export interface MockDataBannerProps {
  customTitle?: string;
  customMessage?: string;
  badgeText?: string;
  style?: React.CSSProperties;
}

export const MockDataBanner: React.FC<MockDataBannerProps> = ({
  customTitle,
  customMessage,
  badgeText,
  style,
}) => {
  const { t } = useTranslation();

  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#f8fafc',
        border: '1px solid #334155',
        borderRadius: 12,
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25), 0 8px 10px -6px rgba(15, 23, 42, 0.25)',
        flexWrap: 'wrap',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Decorative subtle accent border on top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #f59e0b 0%, #0284c7 100%)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 280 }}>
        <div
          style={{
            fontSize: '1.25rem',
            lineHeight: 1,
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '8px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          🚧
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.92rem',
              letterSpacing: '-0.01em',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {customTitle || t('MOCK_DATA_BANNER_TITLE')}
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: '#94a3b8',
              marginTop: 4,
              lineHeight: 1.5,
              fontWeight: 400,
              maxWidth: 900,
              whiteSpace: 'pre-line',
            }}
          >
            {customMessage || t('MOCK_DATA_BANNER_DESC')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            padding: '5px 12px',
            borderRadius: 20,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {badgeText || t('MOCK_DATA_BANNER_BADGE')}
        </span>
      </div>
    </aside>
  );
};

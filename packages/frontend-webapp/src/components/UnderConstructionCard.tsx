import React from 'react';
import { useTranslation, type TranslationKey } from '../i18n/index.js';
import { MockDataBanner } from './MockDataBanner.js';

export interface UnderConstructionCardProps {
  moduleKey: string;
  icon?: string;
  plannedFeatures?: string[];
}

export const UnderConstructionCard: React.FC<UnderConstructionCardProps> = ({
  moduleKey,
  icon = '🚧',
  plannedFeatures = [],
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Institutional Top Alert */}
      <MockDataBanner />

      {/* Main Roadmap & Presentation Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              {icon}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {t(`MODULE_${moduleKey}_TITLE` as TranslationKey) || `${moduleKey} Module`}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
                {t(`MODULE_${moduleKey}_SUBTITLE` as TranslationKey) || t('MODULE_PLANNED_SUBTITLE')}
              </p>
            </div>
          </div>

          <span
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
            {t('MODULE_STATUS_ROADMAP')}
          </span>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Strategic Scope Notice */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.88rem',
              color: '#334155',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: 6 }}>
              📌 {t('ROADMAP_STRATEGY_TITLE')}
            </strong>
            {t('ROADMAP_STRATEGY_DESC')}
          </div>

          {/* Planned Capabilities Section */}
          {plannedFeatures.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  margin: '0 0 14px 0',
                }}
              >
                🚀 {t('ROADMAP_CAPABILITIES_TITLE')}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 12,
                }}
              >
                {plannedFeatures.map((featKey, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <span style={{ color: '#0284c7', fontWeight: 700, fontSize: '0.95rem' }}>✓</span>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500, lineHeight: 1.4 }}>
                      {t(featKey as TranslationKey) || featKey}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security & RBAC Governance Footer */}
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 8,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: '0.82rem',
              color: '#166534',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🛡️</span>
            <span>{t('ROADMAP_SECURITY_NOTE')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

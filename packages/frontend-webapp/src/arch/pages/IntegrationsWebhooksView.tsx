import React from 'react';
import { useI18n } from '../../i18n/index.js';

export const IntegrationsWebhooksView: React.FC = () => {
  const { t } = useI18n();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
              ⚡ {t('NAV_PLATFORM_WEBHOOKS')}
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
              Endpoints receptores e disparadores de eventos assíncronos, orquestradores e mensageria.
            </p>
          </div>
          <button
            type="button"
            style={{
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>+ Novo Webhook</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Kestra Workflows Engine</span>
              <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.70rem', fontWeight: 700, padding: '2px 6px', borderRadius: 6, border: '1px solid #a7f3d0' }}>ONLINE</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              Orquestração declarativa de faturamento de lotes TISS e rotinas noturnas.
            </div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#0284c7', background: '#e0f2fe', padding: '4px 8px', borderRadius: 4 }}>
              http://kestra:8080/api/v1/executions/webhook
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Disparador WhatsApp API</span>
              <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.70rem', fontWeight: 700, padding: '2px 6px', borderRadius: 6, border: '1px solid #a7f3d0' }}>ONLINE</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              Disparo de lembretes de consultas e confirmação automática de presença.
            </div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#0284c7', background: '#e0f2fe', padding: '4px 8px', borderRadius: 4 }}>
              https://api.whatsapp-gateway.local/v1/messages
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

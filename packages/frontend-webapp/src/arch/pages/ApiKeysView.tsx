import React from 'react';
import { useI18n } from '../../i18n/index.js';

export const ApiKeysView: React.FC = () => {
  const { t } = useI18n();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
              🔑 {t('NAV_PLATFORM_API_KEYS')}
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
              Credenciais de autenticação M2M, tokens de serviço e controle de acesso a APIs externas.
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
            <span>+ Gerar Nova Chave</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '10px 14px' }}>Identificador</th>
                <th style={{ padding: '10px 14px' }}>Chave Mascarada</th>
                <th style={{ padding: '10px 14px' }}>Escopo</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px' }}>Expiração</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>Kestra Orchestrator Agent</td>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#475569' }}>sk_live_9f82••••••••••••3a1b</td>
                <td style={{ padding: '12px 14px', color: '#334155' }}>sync:appointments, emit:billing</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 12, fontSize: '0.74rem', fontWeight: 600 }}>
                    ATIVO
                  </span>
                </td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>Sem expiração</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>WhatsApp Gateway M2M</td>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#475569' }}>sk_live_41c0••••••••••••e892</td>
                <td style={{ padding: '12px 14px', color: '#334155' }}>send:notifications</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 12, fontSize: '0.74rem', fontWeight: 600 }}>
                    ATIVO
                  </span>
                </td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>2027-12-31</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

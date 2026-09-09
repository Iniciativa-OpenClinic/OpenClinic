import React from 'react';
import { useTranslation } from '../../i18n/index.js';

export const ProceduresView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
              {t('PROCEDURE_TITLE')}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              {t('PROCEDURE_SUBTITLE')}
            </p>
          </div>
          <button style={{ padding: '8px 14px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            ➕ {t('PROCEDURE_BTN_NEW')}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>{t('PROCEDURE_TH_CODE')}</th>
                <th style={{ padding: '10px 14px' }}>{t('PROCEDURE_TH_DESCRIPTION')}</th>
                <th style={{ padding: '10px 14px' }}>{t('PROCEDURE_TH_SPECIALTY')}</th>
                <th style={{ padding: '10px 14px' }}>{t('PROCEDURE_TH_BASE_PRICE')}</th>
                <th style={{ padding: '10px 14px' }}>{t('GLOBAL_LABEL_STATUS')}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>10101012</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>Consulta Médica em Consultório</td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>Clínica Geral</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155' }}>R$ 180,00</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                    {t('GLOBAL_STATUS_ACTIVE')}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>40101010</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>Eletrocardiograma de Repouso (ECG)</td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>Cardiologia</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155' }}>R$ 120,00</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                    {t('GLOBAL_STATUS_ACTIVE')}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

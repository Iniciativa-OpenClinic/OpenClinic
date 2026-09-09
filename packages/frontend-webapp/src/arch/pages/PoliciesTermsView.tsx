import React from 'react';
import { useI18n } from '../../i18n/index.js';

export const PoliciesTermsView: React.FC = () => {
  const { t } = useI18n();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
          📜 {t('NAV_PLATFORM_POLICIES')}
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#64748b' }}>
          Documentação de governança jurídica, termos de adesão à plataforma e conformidade com a LGPD.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>
              📄 Termos de Uso da Plataforma
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              Versão 1.2 • Vigente desde 01/09/2026. Estabelece responsabilidades operacionais e confidencialidade.
            </div>
            <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600, cursor: 'pointer' }}>
              Visualizar Documento Completo →
            </span>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>
              🛡️ Política de Privacidade & LGPD
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              Diretrizes de proteção e tratamento de dados sensíveis de saúde conforme a Lei Geral de Proteção de Dados.
            </div>
            <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600, cursor: 'pointer' }}>
              Visualizar Documento Completo →
            </span>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>
              🤝 Acordo de Tratamento de Dados (DPA)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              Contrato Mestre de Operador e Controlador de Dados para os contratantes e clínicas afiliadas.
            </div>
            <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600, cursor: 'pointer' }}>
              Visualizar Documento Completo →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

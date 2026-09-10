import React from 'react';

export const BillingTissView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>Faturamento de Convênios & Lotes TISS</h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.80rem', color: '#64748b' }}>Exportação de arquivos XML TISS, fechamento de guias e recursos de glosas</p>
        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Lote Unimed Nacional • Agosto/2026</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>Status: <span style={{ color: '#0284c7', fontWeight: 700 }}>XML Gerado e Validado</span> (182 guias)</div>
        </div>
      </div>
    </div>
  );
};

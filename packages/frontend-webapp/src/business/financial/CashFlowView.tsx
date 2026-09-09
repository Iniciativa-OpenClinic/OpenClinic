import React from 'react';

export const CashFlowView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Entradas (Hoje)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>R$ 4.850,00</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Saídas (Hoje)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>R$ 1.220,00</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Saldo em Caixa</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>R$ 3.630,00</div>
        </div>
      </div>
    </div>
  );
};

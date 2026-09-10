import React from 'react';

export const PayablesReceivablesView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>Contas a Pagar & Receber</h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.80rem', color: '#64748b' }}>Gestão de títulos, notas fiscais, fornecedores e conciliação bancária</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Fornecedor Oxigênio Hospitalar</div>
            <div style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 700, marginTop: 4 }}>R$ 890,00 (Vence amanhã)</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Repasse Bradesco Saúde (Lote 142)</div>
            <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 700, marginTop: 4 }}>R$ 14.580,00 (Previsto para 05/09)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

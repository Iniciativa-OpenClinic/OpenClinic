import React from 'react';

export const DocsTemplatesView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>Modelos de Documentos Clínicos & Atestados</h3>
        <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#64748b' }}>Gerenciador de templates para receitas de controle especial, atestados e laudos</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>📄 Atestado Médico Padrão</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Template com campos CID-10 e período de afastamento</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>💊 Receituário de Controle Especial (C1 / B1)</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Layout regulamentado pela ANVISA com dados da gráfica/emissor</div>
          </div>
        </div>
      </div>
    </div>
  );
};

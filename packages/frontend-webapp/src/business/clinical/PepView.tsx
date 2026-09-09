import React from 'react';

export const PepView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>Prontuário Eletrônico do Paciente (PEP)</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.80rem', color: '#64748b' }}>Evoluções clínicas, anamnese, prescrições e histórico de atendimentos</p>
          </div>
          <button style={{ padding: '8px 14px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            ➕ Nova Evolução Clínica
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Evolução Clínica • Maria Aparecida da Silva</div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>30/08/2026 11:30 - Dr. Carlos Mendes</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#334155', margin: '8px 0 0', lineHeight: 1.5 }}>
              Paciente comparece com queixas de cefaleia tensional e pressão arterial em 130/85 mmHg. Realizada orientação terapêutica e prescrição de analgésico sintomático.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Retorno e Avaliação de Exames • João Pedro Oliveira</div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>28/08/2026 15:45 - Dra. Juliana Ribeiro</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#334155', margin: '8px 0 0', lineHeight: 1.5 }}>
              Exames laboratoriais normais dentro dos parâmetros de referência. Sem sinais de infecção aguda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

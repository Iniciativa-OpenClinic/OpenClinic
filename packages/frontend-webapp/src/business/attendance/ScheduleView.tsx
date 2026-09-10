import React from 'react';

export const ScheduleView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>Agenda Ambulatorial & Grade de Horários</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Agendamento de consultas, retornos e procedimentos clínicos</p>
          </div>
          <button style={{ padding: '8px 14px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            ➕ Novo Agendamento
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>08:00 - 08:30</div>
            <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 4 }}>Maria Aparecida da Silva</div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Dr. Carlos Mendes • Consulta Geral</div>
            <span style={{ display: 'inline-block', marginTop: 8, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>Confirmado</span>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>08:30 - 09:00</div>
            <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 4 }}>João Pedro Oliveira</div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Dra. Juliana Ribeiro • Retorno</div>
            <span style={{ display: 'inline-block', marginTop: 8, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>Aguardando</span>
          </div>

          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>09:00 - 09:30</div>
            <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 4 }}>Horário Livre</div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Dr. Carlos Mendes</div>
            <span style={{ display: 'inline-block', marginTop: 8, background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>Disponível</span>
          </div>
        </div>
      </div>
    </div>
  );
};

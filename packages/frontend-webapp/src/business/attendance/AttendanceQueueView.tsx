import React from 'react';

export const AttendanceQueueView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Atendimentos Hoje</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>34</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 2 }}>▲ +12% em relação a ontem</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Fila de Espera</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#eab308', marginTop: 4 }}>5</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>Tempo médio: 12 min</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Em Consulta</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>3</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>3 consultórios ativos</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Finalizados</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>26</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 2 }}>100% registros sincronizados</div>
        </div>
      </div>

      {/* Fila de Atendimento do Dia */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>Fila de Atendimento & Triagem (Hoje)</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Pacientes recepcionados e aguardando chamada clínica</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 14px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              ➕ Iniciar Nova Triagem
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Paciente</th>
                <th style={{ padding: '10px 14px' }}>Chegada</th>
                <th style={{ padding: '10px 14px' }}>Classificação de Risco</th>
                <th style={{ padding: '10px 14px' }}>Médico / Sala</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>Maria Aparecida da Silva</td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>11:15</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                    🔴 Amarelo (Urgente)
                  </span>
                </td>
                <td style={{ padding: '12px 14px', color: '#334155' }}>Dr. Carlos Mendes (Consultório 2)</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600 }}>
                    Aguardando Chamada
                  </span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  <button style={{ padding: '5px 10px', borderRadius: 6, background: '#0284c7', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Chamar
                  </button>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>João Pedro Oliveira</td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>11:22</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                    🟢 Verde (Pouco Urgente)
                  </span>
                </td>
                <td style={{ padding: '12px 14px', color: '#334155' }}>Dra. Juliana Ribeiro (Consultório 1)</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600 }}>
                    Em Atendimento
                  </span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  <button style={{ padding: '5px 10px', borderRadius: 6, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Prontuário
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

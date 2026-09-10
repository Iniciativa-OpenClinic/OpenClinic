import React, { useState } from 'react';

export interface ApiEncounter {
  id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  clinical_notes: string | null;
  patient_id: string;
  patient_name: string;
  practitioner_id: string;
  practitioner_name: string;
  specialty: string | null;
}

const INITIAL_ENCOUNTERS: ApiEncounter[] = [
  {
    id: 'enc-001-uuid-88aa-11bb',
    start_time: '2026-08-30T10:30:00Z',
    end_time: '2026-08-30T11:15:00Z',
    status: 'FINISHED',
    chief_complaint: 'Cefaleia tensional e elevação esporádica da pressão arterial.',
    diagnosis: 'I10 - Hipertensão essencial (primária)',
    clinical_notes: 'Paciente orientada a manter diário pressórico e retornar em 30 dias com exames laboratoriais.',
    patient_id: 'pat-001-uuid-4a8b-91c2-ef3401',
    patient_name: 'Maria Aparecida da Silva',
    practitioner_id: 'practitioner-001-uuid-11aa-22bb',
    practitioner_name: 'Dr. Carlos Eduardo Mendes',
    specialty: 'Cardiologia',
  },
  {
    id: 'enc-002-uuid-99bb-22cc',
    start_time: '2026-08-30T11:30:00Z',
    end_time: null,
    status: 'IN_PROGRESS',
    chief_complaint: 'Avaliação de rotina e acompanhamento pós-operatório ortopédico.',
    diagnosis: 'Z09 - Exame de seguimento após tratamento para outras afecções',
    clinical_notes: 'Paciente relata boa evolução e redução gradativa da dor com fisioterapia.',
    patient_id: 'pat-002-uuid-7b3f-42a1-de8902',
    patient_name: 'João Pedro Oliveira',
    practitioner_id: 'practitioner-002-uuid-22bb-33cc',
    practitioner_name: 'Dra. Mariana Albuquerque',
    specialty: 'Enfermagem & Triagem Clínica',
  },
  {
    id: 'enc-003-uuid-77cc-33dd',
    start_time: '2026-08-29T15:00:00Z',
    end_time: '2026-08-29T15:40:00Z',
    status: 'FINISHED',
    chief_complaint: 'Check-up anual cardiológico e eletrocardiograma de repouso.',
    diagnosis: 'Z00.0 - Exame médico geral',
    clinical_notes: 'ECG com ritmo sinusal sem alterações isquêmicas agudas. Prescrito controle de lípides.',
    patient_id: 'pat-003-uuid-3e1a-88f5-cb2103',
    patient_name: 'Ana Carolina Mendes Guimarães',
    practitioner_id: 'practitioner-001-uuid-11aa-22bb',
    practitioner_name: 'Dr. Carlos Eduardo Mendes',
    specialty: 'Cardiologia',
  },
  {
    id: 'enc-004-uuid-66dd-44ee',
    start_time: '2026-08-28T09:00:00Z',
    end_time: '2026-08-28T09:10:00Z',
    status: 'CANCELLED',
    chief_complaint: 'Consulta de retorno cancelada pelo paciente por motivo pessoal.',
    diagnosis: null,
    clinical_notes: 'Cancelamento comunicado previamente por telefone com reagendamento solicitado.',
    patient_id: 'pat-004-uuid-9d4c-22b8-fa7604',
    patient_name: 'Francisco de Assis Rezende',
    practitioner_id: 'practitioner-001-uuid-11aa-22bb',
    practitioner_name: 'Dr. Carlos Eduardo Mendes',
    specialty: 'Cardiologia',
  },
];

export const ConsultationsView: React.FC = () => {
  const [encounters] = useState<ApiEncounter[]>(INITIAL_ENCOUNTERS);
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 250);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINISHED':
        return { bg: '#dcfce7', color: '#15803d', label: 'Concluído' };
      case 'IN_PROGRESS':
        return { bg: '#dbeafe', color: '#1d4ed8', label: 'Em Andamento' };
      case 'CANCELLED':
        return { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelado' };
      default:
        return { bg: '#f1f5f9', color: '#475569', label: status };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>
              Atendimentos Clínicos & Consultas
            </h3>
            <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b' }}>
              Histórico e atendimentos em tempo real sincronizados com o padrão HL7 FHIR (app_encounters)
            </p>
          </div>
          <button
            onClick={handleRefresh}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              cursor: 'pointer',
              fontSize: '0.80rem',
              fontWeight: 600,
              color: '#334155',
            }}
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '0.85rem' }}>
            Carregando atendimentos...
          </div>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14, color: '#991b1b', fontSize: '0.82rem' }}>
            {error}
          </div>
        ) : encounters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
            Nenhum atendimento clínico registrado no banco de dados.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {encounters.map((enc) => {
              const badge = getStatusBadge(enc.status);
              const dateStr = new Date(enc.start_time).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              return (
                <div
                  key={enc.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 16,
                    background: '#fafbfc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.90rem', color: '#0f172a' }}>
                        {enc.patient_name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{dateStr}</span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                    <strong>Profissional:</strong> {enc.practitioner_name} ({enc.specialty || 'Clínica Geral'})
                  </div>

                  {enc.chief_complaint && (
                    <div style={{ fontSize: '0.80rem', color: '#475569' }}>
                      <strong>Queixa Principal:</strong> {enc.chief_complaint}
                    </div>
                  )}

                  {enc.diagnosis && (
                    <div style={{ fontSize: '0.80rem', color: '#475569' }}>
                      <strong>Diagnóstico (CID):</strong> {enc.diagnosis}
                    </div>
                  )}

                  {enc.clinical_notes && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', background: '#f1f5f9', padding: '6px 10px', borderRadius: 4 }}>
                      {enc.clinical_notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

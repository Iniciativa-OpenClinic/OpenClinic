import React, { useState, useMemo, useEffect } from 'react';
import { AlertBanner, AlertBannerType } from '../../components/AlertBanner.js';

export interface Patient {
  id: string;
  tenant_id: string;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  sexo: 'MASCULINO' | 'FEMININO' | 'OUTRO';
  email: string;
  telefone: string;
  endereco_completo: string;
  contato_emergencia: string;
  convenio_nome: string;
  convenio_numero: string;
  observacoes_alergias: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY_PATIENTS = 'openclinic_patients_data';

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-001-uuid-4a8b-91c2-ef3401',
    tenant_id: 'default-tenant',
    nome_completo: 'Maria Aparecida da Silva',
    cpf: '123.456.789-00',
    data_nascimento: '1984-05-14',
    sexo: 'FEMININO',
    email: 'maria.silva@email.com',
    telefone: '(11) 98765-4321',
    endereco_completo: 'Av. Paulista, 1000, Apto 42 - Bela Vista, São Paulo/SP',
    contato_emergencia: 'Carlos Silva (Esposo) - (11) 98888-1111',
    convenio_nome: 'Unimed Nacional',
    convenio_numero: '0037.9821.4421.00-1',
    observacoes_alergias: 'Alergia severa a Dipirona e Penicilina. Histórico de bronquite asmática.',
    is_active: true,
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-08-28T14:30:00Z',
  },
  {
    id: 'pat-002-uuid-7b3f-42a1-de8902',
    tenant_id: 'default-tenant',
    nome_completo: 'João Pedro Oliveira',
    cpf: '987.654.321-99',
    data_nascimento: '1992-11-20',
    sexo: 'MASCULINO',
    email: 'joao.pedro@email.com',
    telefone: '(11) 91234-5678',
    endereco_completo: 'Rua Augusta, 550, Casa 3 - Consolação, São Paulo/SP',
    contato_emergencia: 'Fernanda Oliveira (Irmã) - (11) 97777-2222',
    convenio_nome: 'Particular',
    convenio_numero: 'PART-2026-88',
    observacoes_alergias: 'Sem alergias medicamentosas relatadas.',
    is_active: true,
    created_at: '2026-02-15T11:20:00Z',
    updated_at: '2026-08-30T09:15:00Z',
  },
  {
    id: 'pat-003-uuid-3e1a-88f5-cb2103',
    tenant_id: 'default-tenant',
    nome_completo: 'Ana Carolina Mendes Guimarães',
    cpf: '345.678.901-22',
    data_nascimento: '2001-03-08',
    sexo: 'FEMININO',
    email: 'ana.guimaraes@email.com',
    telefone: '(11) 99881-2345',
    endereco_completo: 'Rua Domingos de Morais, 1200 - Vila Mariana, São Paulo/SP',
    contato_emergencia: 'Roberto Guimarães (Pai) - (11) 99111-3333',
    convenio_nome: 'Bradesco Saúde',
    convenio_numero: 'BRAD-7749-0129',
    observacoes_alergias: 'Intolerância a anti-inflamatórios não esteroides (AINEs).',
    is_active: true,
    created_at: '2026-03-20T14:10:00Z',
    updated_at: '2026-08-25T16:00:00Z',
  },
  {
    id: 'pat-004-uuid-9d4c-22b8-fa7604',
    tenant_id: 'default-tenant',
    nome_completo: 'Francisco de Assis Rezende',
    cpf: '456.789.012-33',
    data_nascimento: '1965-09-25',
    sexo: 'MASCULINO',
    email: 'francisco.rezende@email.com',
    telefone: '(11) 97654-3210',
    endereco_completo: 'Rua Vergueiro, 2400, Bloco B - Chácara Klabin, São Paulo/SP',
    contato_emergencia: 'Luciana Rezende (Filha) - (11) 98444-5555',
    convenio_nome: 'SulAmérica Saúde',
    convenio_numero: 'SUL-9901-5521',
    observacoes_alergias: 'Hipertenso e diabético tipo 2. Uso contínuo de Losartana e Metformina.',
    is_active: true,
    created_at: '2026-04-05T08:45:00Z',
    updated_at: '2026-08-29T17:20:00Z',
  },
  {
    id: 'pat-005-uuid-1f8a-33c9-ab4505',
    tenant_id: 'default-tenant',
    nome_completo: 'Juliana Beatriz Santos Rocha',
    cpf: '567.890.123-44',
    data_nascimento: '1995-12-03',
    sexo: 'FEMININO',
    email: 'juliana.rocha@email.com',
    telefone: '(11) 96543-2109',
    endereco_completo: 'Alameda Santos, 800 - Cerqueira César, São Paulo/SP',
    contato_emergencia: 'Marcos Rocha (Irmão) - (11) 98111-9999',
    convenio_nome: 'Porto Seguro Saúde',
    convenio_numero: 'PORTO-3321-771',
    observacoes_alergias: 'Alergia a frutos do mar e contraste iodado.',
    is_active: false,
    created_at: '2026-05-12T13:30:00Z',
    updated_at: '2026-07-10T10:00:00Z',
  },
];

export const PatientsView: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PATIENTS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return INITIAL_PATIENTS;
  });

  // Salvar no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
    } catch {
      // ignore
    }
  }, [patients]);



  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHealthPlan, setFilterHealthPlan] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterHasAllergies, setFilterHasAllergies] = useState(false);

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<Patient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);
  const [feedback, setFeedback] = useState<{ type: AlertBannerType; msg: string } | null>(null);

  // Estados do formulário
  const [formTab, setFormTab] = useState<'personal' | 'contact' | 'clinical'>('personal');
  const [formNome, setFormNome] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formDataNasc, setFormDataNasc] = useState('');
  const [formSexo, setFormSexo] = useState<'MASCULINO' | 'FEMININO' | 'OUTRO'>('FEMININO');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formEmergencia, setFormEmergencia] = useState('');
  const [formConvenioNome, setFormConvenioNome] = useState('Unimed Nacional');
  const [formConvenioNumero, setFormConvenioNumero] = useState('');
  const [formAlergias, setFormAlergias] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Máscaras auxiliares
  const formatCPF = (val: string) => {
    const numbers = val.replace(/\D/g, '').slice(0, 11);
    return numbers
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  };

  const formatPhone = (val: string) => {
    const numbers = val.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return numbers.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const calculateAge = (birthDate: string): string => {
    if (!birthDate) return 'N/I';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} anos`;
  };

  // Abrir modal de criação
  const handleOpenCreate = () => {
    setEditingPatient(null);
    setFormTab('personal');
    setFormNome('');
    setFormCpf('');
    setFormDataNasc('');
    setFormSexo('FEMININO');
    setFormEmail('');
    setFormTelefone('');
    setFormEndereco('');
    setFormEmergencia('');
    setFormConvenioNome('Unimed Nacional');
    setFormConvenioNumero('');
    setFormAlergias('');
    setFormActive(true);
    setFormError(null);
    setShowFormModal(true);
  };

  // Abrir modal de edição
  const handleOpenEdit = (p: Patient) => {
    setEditingPatient(p);
    setFormTab('personal');
    setFormNome(p.nome_completo);
    setFormCpf(p.cpf);
    setFormDataNasc(p.data_nascimento);
    setFormSexo(p.sexo);
    setFormEmail(p.email);
    setFormTelefone(p.telefone);
    setFormEndereco(p.endereco_completo);
    setFormEmergencia(p.contato_emergencia);
    setFormConvenioNome(p.convenio_nome);
    setFormConvenioNumero(p.convenio_numero);
    setFormAlergias(p.observacoes_alergias);
    setFormActive(p.is_active);
    setFormError(null);
    setShowFormModal(true);
  };

  // Salvar paciente
  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setFormError('O Nome Completo do paciente é obrigatório.');
      setFormTab('personal');
      return;
    }
    if (!formCpf.trim()) {
      setFormError('O CPF do paciente é obrigatório.');
      setFormTab('personal');
      return;
    }

    if (editingPatient) {
      // Atualizar
      setPatients((prev) =>
        prev.map((p) =>
          p.id === editingPatient.id
            ? {
                ...p,
                nome_completo: formNome.trim(),
                cpf: formCpf.trim(),
                data_nascimento: formDataNasc,
                sexo: formSexo,
                email: formEmail.trim(),
                telefone: formTelefone.trim(),
                endereco_completo: formEndereco.trim(),
                contato_emergencia: formEmergencia.trim(),
                convenio_nome: formConvenioNome,
                convenio_numero: formConvenioNumero.trim(),
                observacoes_alergias: formAlergias.trim(),
                is_active: formActive,
                updated_at: new Date().toISOString(),
              }
            : p
        )
      );
      setFeedback({
        type: AlertBannerType.SUCCESS,
        msg: `Cadastro do paciente "${formNome}" atualizado com sucesso!`,
      });
    } else {
      // Criar
      const newPat: Patient = {
        id: `pat-${Date.now()}-uuid-${Math.random().toString(36).substring(2, 8)}`,
        tenant_id: 'default-tenant',
        nome_completo: formNome.trim(),
        cpf: formCpf.trim(),
        data_nascimento: formDataNasc,
        sexo: formSexo,
        email: formEmail.trim(),
        telefone: formTelefone.trim(),
        endereco_completo: formEndereco.trim(),
        contato_emergencia: formEmergencia.trim(),
        convenio_nome: formConvenioNome,
        convenio_numero: formConvenioNumero.trim(),
        observacoes_alergias: formAlergias.trim(),
        is_active: formActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPatients((prev) => [newPat, ...prev]);

      setFeedback({
        type: AlertBannerType.SUCCESS,
        msg: `Novo paciente "${formNome}" cadastrado com sucesso!`,
      });
    }

    setShowFormModal(false);
  };

  // Alternar status
  const handleToggleStatus = (p: Patient) => {
    const updatedStatus = !p.is_active;
    setPatients((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, is_active: updatedStatus, updated_at: new Date().toISOString() } : item))
    );
    setFeedback({
      type: AlertBannerType.INFO,
      msg: `Paciente "${p.nome_completo}" ${updatedStatus ? 'ativado' : 'desativado'} com sucesso.`,
    });
  };

  // Excluir paciente
  const handleDeletePatient = () => {
    if (!confirmDelete) return;
    setPatients((prev) => prev.filter((item) => item.id !== confirmDelete.id));
    setFeedback({
      type: AlertBannerType.WARNING,
      msg: `Registro do paciente "${confirmDelete.nome_completo}" removido.`,
    });
    setConfirmDelete(null);
  };

  // Lista de convênios únicos para filtro
  const uniqueHealthPlans = useMemo(() => {
    const set = new Set<string>();
    patients.forEach((p) => {
      if (p.convenio_nome) set.add(p.convenio_nome);
    });
    return Array.from(set);
  }, [patients]);

  // Lista filtrada
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Busca textual
      const query = searchTerm.toLowerCase();
      const matchQuery =
        !query ||
        p.nome_completo.toLowerCase().includes(query) ||
        p.cpf.toLowerCase().includes(query) ||
        p.telefone.toLowerCase().includes(query) ||
        p.convenio_numero.toLowerCase().includes(query);

      // Convênio
      const matchPlan = filterHealthPlan === 'ALL' || p.convenio_nome === filterHealthPlan;

      // Status
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && p.is_active) ||
        (filterStatus === 'INACTIVE' && !p.is_active);

      // Alergias
      const matchAllergies =
        !filterHasAllergies ||
        (p.observacoes_alergias &&
          p.observacoes_alergias.trim().length > 0 &&
          !p.observacoes_alergias.toLowerCase().includes('sem alergias'));

      return matchQuery && matchPlan && matchStatus && matchAllergies;
    });
  }, [patients, searchTerm, filterHealthPlan, filterStatus, filterHasAllergies]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = patients.length;
    const active = patients.filter((p) => p.is_active).length;
    const withAllergies = patients.filter(
      (p) =>
        p.observacoes_alergias &&
        p.observacoes_alergias.trim().length > 0 &&
        !p.observacoes_alergias.toLowerCase().includes('sem alergias')
    ).length;
    const particular = patients.filter((p) => p.convenio_nome.toLowerCase().includes('particular')).length;
    return { total, active, withAllergies, particular };
  }, [patients]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.86rem',
    boxSizing: 'border-box',
    outline: 'none',
    color: '#0f172a',
    background: '#ffffff',
    transition: 'border-color 0.15s ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: 5,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Feedback Banner */}
      {feedback && (
        <AlertBanner
          type={feedback.type}
          message={feedback.msg}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Header com Boas-vindas e Ação Principal */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.6rem' }}>🧑‍🤝‍🧑</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                Cadastro Geral de Pacientes
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.80rem', color: '#64748b' }}>
                Gestão de prontuários clínicos, identificação, contatos e operadoras de saúde
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.35)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(2, 132, 199, 0.25)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span>➕</span> Novo Paciente
          </button>
        </div>
      </div>

      {/* Cards de Métricas e KPIs Rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total de Pacientes
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: 3, fontWeight: 600 }}>
            Base ativa da clínica
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pacientes Ativos
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
            {stats.active}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: 3, fontWeight: 600 }}>
            {Math.round((stats.active / (stats.total || 1)) * 100)}% de regularidade
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Alertas de Alergia
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
            {stats.withAllergies}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: 3, fontWeight: 600 }}>
            Atenção assistencial reforçada
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Atendimentos Particulares
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {stats.particular}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: 3, fontWeight: 600 }}>
            Sem intermediação de operadora
          </div>
        </div>
      </div>

      {/* Tabela de Pacientes com Barra de Filtros */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        {/* Barra de Filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8', fontSize: '0.9rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar por Nome, CPF, Telefone ou Matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>

          <div style={{ width: 180 }}>
            <select
              value={filterHealthPlan}
              onChange={(e) => setFilterHealthPlan(e.target.value)}
              style={inputStyle}
            >
              <option value="ALL">Todos os Convênios</option>
              {uniqueHealthPlans.map((hp) => (
                <option key={hp} value={hp}>
                  {hp}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: 140 }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={inputStyle}
            >
              <option value="ALL">Todos Status</option>
              <option value="ACTIVE">Apenas Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setFilterHasAllergies((prev) => !prev)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: filterHasAllergies ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
              background: filterHasAllergies ? 'rgba(220, 38, 38, 0.08)' : '#f8fafc',
              color: filterHasAllergies ? '#dc2626' : '#475569',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚠️</span> Com Alergias {filterHasAllergies && '✓'}
          </button>

          {(searchTerm || filterHealthPlan !== 'ALL' || filterStatus !== 'ALL' || filterHasAllergies) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterHealthPlan('ALL');
                setFilterStatus('ALL');
                setFilterHasAllergies(false);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Tabela */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 14px' }}>Paciente</th>
                <th style={{ padding: '12px 14px' }}>CPF & Idade</th>
                <th style={{ padding: '12px 14px' }}>Contato</th>
                <th style={{ padding: '12px 14px' }}>Convênio / Matrícula</th>
                <th style={{ padding: '12px 14px' }}>Alertas Clínicos</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 14px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>🧑‍🤝‍🧑</div>
                    <div style={{ fontWeight: 600, color: '#334155' }}>Nenhum paciente encontrado</div>
                    <div style={{ fontSize: '0.76rem', marginTop: 2 }}>Tente ajustar os termos de busca ou filtros aplicados.</div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const hasCriticalAllergies =
                    p.observacoes_alergias &&
                    p.observacoes_alergias.trim().length > 0 &&
                    !p.observacoes_alergias.toLowerCase().includes('sem alergias');

                  const isParticular = p.convenio_nome.toLowerCase().includes('particular');

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Paciente com Avatar */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                              color: '#0369a1',
                              fontWeight: 800,
                              fontSize: '0.80rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              border: '1px solid #bae6fd',
                            }}
                          >
                            {p.nome_completo.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>
                              {p.nome_completo}
                            </div>
                            <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: 1 }}>
                              {p.sexo === 'FEMININO' ? 'Feminino' : p.sexo === 'MASCULINO' ? 'Masculino' : 'Outro'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CPF & Idade */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#334155', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                          {p.cpf || 'Não informado'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 1 }}>
                          {calculateAge(p.data_nascimento)} ({p.data_nascimento ? p.data_nascimento.split('-').reverse().join('/') : 'N/D'})
                        </div>
                      </td>

                      {/* Contato */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#0f172a', fontWeight: 500 }}>{p.telefone || '-'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 1 }}>{p.email || '-'}</div>
                      </td>

                      {/* Convênio & Carteirinha */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: isParticular ? '#fef3c7' : '#e0f2fe',
                            color: isParticular ? '#92400e' : '#0369a1',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: isParticular ? '1px solid #fde68a' : '1px solid #bae6fd',
                          }}
                        >
                          {p.convenio_nome}
                        </span>
                        {p.convenio_numero && (
                          <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>
                            {p.convenio_numero}
                          </div>
                        )}
                      </td>

                      {/* Alertas Clínicos */}
                      <td style={{ padding: '12px 14px' }}>
                        {hasCriticalAllergies ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              maxWidth: 220,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={p.observacoes_alergias}
                          >
                            <span>⚠️</span> {p.observacoes_alergias}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            Nenhum alerta crítico
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: p.is_active ? '#dcfce7' : '#f1f5f9',
                            color: p.is_active ? '#15803d' : '#64748b',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: p.is_active ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.is_active ? '#22c55e' : '#94a3b8' }} />
                          {p.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setShowDetailsModal(p)}
                            title="Visualizar Prontuário Rápido"
                            style={{
                              padding: '5px 9px',
                              borderRadius: 6,
                              background: '#f0f9ff',
                              color: '#0284c7',
                              border: '1px solid #bae6fd',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            📑 Prontuário
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            title="Editar Dados Cadastrais"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: '#f8fafc',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            title={p.is_active ? 'Desativar Paciente' : 'Ativar Paciente'}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: p.is_active ? '#fff1f2' : '#f0fdf4',
                              color: p.is_active ? '#e11d48' : '#16a34a',
                              border: p.is_active ? '1px solid #fecdd3' : '1px solid #bbf7d0',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {p.is_active ? '⛔' : '✅'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmDelete(p)}
                            title="Remover Cadastro"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fee2e2',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição de Paciente */}
      {showFormModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingPatient ? '✏️ Editar Cadastro de Paciente' : '➕ Novo Cadastro de Paciente'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                  Preencha os dados do paciente em conformidade com o prontuário eletrônico
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Abas do Formulário */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 22px' }}>
              <button
                type="button"
                onClick={() => setFormTab('personal')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: formTab === 'personal' ? '2px solid #0284c7' : '2px solid transparent',
                  color: formTab === 'personal' ? '#0284c7' : '#64748b',
                  fontWeight: formTab === 'personal' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                1. Dados Pessoais & Documentos
              </button>
              <button
                type="button"
                onClick={() => setFormTab('contact')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: formTab === 'contact' ? '2px solid #0284c7' : '2px solid transparent',
                  color: formTab === 'contact' ? '#0284c7' : '#64748b',
                  fontWeight: formTab === 'contact' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                2. Contato & Endereço
              </button>
              <button
                type="button"
                onClick={() => setFormTab('clinical')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: formTab === 'clinical' ? '2px solid #0284c7' : '2px solid transparent',
                  color: formTab === 'clinical' ? '#0284c7' : '#64748b',
                  fontWeight: formTab === 'clinical' ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                3. Convênio & Alertas Clínicos
              </button>
            </div>

            {/* Conteúdo do Formulário */}
            <form onSubmit={handleSavePatient} style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: '0.80rem' }}>
                  ⚠️ {formError}
                </div>
              )}

              {/* Aba 1: Dados Pessoais */}
              {formTab === 'personal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nome Completo do Paciente *</label>
                    <input
                      type="text"
                      placeholder="Ex: Maria Aparecida da Silva"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>CPF *</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={formCpf}
                        onChange={(e) => setFormCpf(formatCPF(e.target.value))}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Data de Nascimento</label>
                      <input
                        type="date"
                        value={formDataNasc}
                        onChange={(e) => setFormDataNasc(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Sexo / Gênero</label>
                      <select
                        value={formSexo}
                        onChange={(e) => setFormSexo(e.target.value as any)}
                        style={inputStyle}
                      >
                        <option value="FEMININO">Feminino</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="OUTRO">Outro / Não Informado</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Status Cadastral</label>
                      <select
                        value={formActive ? 'active' : 'inactive'}
                        onChange={(e) => setFormActive(e.target.value === 'active')}
                        style={inputStyle}
                      >
                        <option value="active">Ativo (Permite Agendamentos)</option>
                        <option value="inactive">Inativo / Arquivado</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Aba 2: Contato & Endereço */}
              {formTab === 'contact' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Telefone / WhatsApp</label>
                      <input
                        type="text"
                        placeholder="(11) 98765-4321"
                        value={formTelefone}
                        onChange={(e) => setFormTelefone(formatPhone(e.target.value))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>E-mail de Contato</label>
                      <input
                        type="email"
                        placeholder="paciente@exemplo.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Endereço Completo</label>
                    <input
                      type="text"
                      placeholder="Rua, Número, Bairro, Cidade/UF, CEP"
                      value={formEndereco}
                      onChange={(e) => setFormEndereco(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Contato de Emergência (Nome e Telefone)</label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Silva (Esposo) - (11) 98888-1111"
                      value={formEmergencia}
                      onChange={(e) => setFormEmergencia(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Aba 3: Convênio & Clínico */}
              {formTab === 'clinical' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Operadora / Convênio</label>
                      <input
                        type="text"
                        placeholder="Ex: Unimed Nacional, Bradesco, Particular"
                        value={formConvenioNome}
                        onChange={(e) => setFormConvenioNome(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Número da Carteirinha / Matrícula</label>
                      <input
                        type="text"
                        placeholder="Ex: 0037.9821.4421.00-1"
                        value={formConvenioNumero}
                        onChange={(e) => setFormConvenioNumero(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Alertas Críticos, Alergias & Comorbidades</label>
                    <textarea
                      placeholder="Descreva alergias a medicamentos (Dipirona, Penicilina), alimentos, restrições ou comorbidades importantes..."
                      value={formAlergias}
                      onChange={(e) => setFormAlergias(e.target.value)}
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                    <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: 4 }}>
                      ⚠️ Este aviso será destacado em vermelho no prontuário e na recepção para segurança do paciente.
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Modal */}
              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: 16,
                  marginTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  {formTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => setFormTab(formTab === 'clinical' ? 'contact' : 'personal')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.80rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ← Voltar
                    </button>
                  )}
                  {formTab !== 'clinical' && (
                    <button
                      type="button"
                      onClick={() => setFormTab(formTab === 'personal' ? 'contact' : 'clinical')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: '#f1f5f9',
                        color: '#0284c7',
                        border: '1px solid #bae6fd',
                        fontSize: '0.80rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Próximo →
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: 'transparent',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    💾 {editingPatient ? 'Salvar Alterações' : 'Concluir Cadastro'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer de Visualização de Prontuário Rápido */}
      {showDetailsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 640,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Header com Avatar */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                padding: '20px 24px',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {showDetailsModal.nome_completo.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.70rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Prontuário Geral do Paciente
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                    {showDetailsModal.nome_completo}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 2, display: 'flex', gap: 8 }}>
                    <span>CPF: {showDetailsModal.cpf}</span>
                    <span>•</span>
                    <span>{calculateAge(showDetailsModal.data_nascimento)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Prontuário */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Alerta de Alergias */}
              {showDetailsModal.observacoes_alergias &&
              !showDetailsModal.observacoes_alergias.toLowerCase().includes('sem alergias') ? (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    borderRadius: 10,
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#991b1b', fontWeight: 800, fontSize: '0.84rem' }}>
                    <span>⚠️</span> ALERTA CLÍNICO & ALERGIAS:
                  </div>
                  <div style={{ color: '#7f1d1d', fontSize: '0.82rem', marginTop: 4, lineHeight: 1.4 }}>
                    {showDetailsModal.observacoes_alergias}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#166534',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                  }}
                >
                  ✓ Nenhuma alergia medicamentosa severa registrada para este paciente.
                </div>
              )}

              {/* Informações de Convênio */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                  🏥 Cobertura Assistencial & Convênio
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.84rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.76rem' }}>Operadora:</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{showDetailsModal.convenio_nome}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.76rem' }}>Carteirinha / Matrícula:</span>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                      {showDetailsModal.convenio_numero || 'Não informado'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações de Contato e Emergência */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                  📞 Contatos & Emergência
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.84rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.76rem' }}>Telefone:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{showDetailsModal.telefone || '-'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.76rem' }}>E-mail:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{showDetailsModal.email || '-'}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748b', fontSize: '0.76rem' }}>Contato de Emergência:</span>
                    <div style={{ fontWeight: 700, color: '#dc2626' }}>
                      {showDetailsModal.contato_emergencia || 'Nenhum contato de emergência cadastrado'}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748b', fontSize: '0.76rem' }}>Endereço Residencial:</span>
                    <div style={{ color: '#334155' }}>{showDetailsModal.endereco_completo || 'Não informado'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div
              style={{
                padding: '14px 22px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const p = showDetailsModal;
                  setShowDetailsModal(null);
                  handleOpenEdit(p);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✏️ Editar Cadastro
              </button>

              <button
                type="button"
                onClick={() => setShowDetailsModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 440,
              padding: 22,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>🗑️</div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Confirmar Exclusão de Paciente
            </h3>
            <p style={{ margin: '8px 0 16px', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
              Tem certeza que deseja remover o cadastro do paciente{' '}
              <strong style={{ color: '#0f172a' }}>{confirmDelete.nome_completo}</strong> (CPF: {confirmDelete.cpf})?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

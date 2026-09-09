import React, { useState, useMemo, useEffect } from 'react';
import { AlertBanner, AlertBannerType } from '../../components/AlertBanner.js';
import { useTranslation } from '../../i18n/index.js';

export interface ApiPractitioner {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  cpf: string | null;
  practitioner_type: string;
  job_title: string | null;
  council_type: string | null;
  council_number: string | null;
  council_uf: string | null;
  primary_specialty: string | null;
  phone: string | null;
  email: string | null;
  is_clinical_staff: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY_PRACTITIONERS = 'openclinic_practitioners_data';

const INITIAL_PRACTITIONERS: ApiPractitioner[] = [
  {
    id: 'practitioner-001-uuid-11aa-22bb',
    tenant_id: 'default-tenant',
    user_id: 'usr-carlos-mendes',
    full_name: 'Dr. Carlos Eduardo Mendes',
    cpf: '111.222.333-44',
    practitioner_type: 'CLINICAL',
    job_title: 'Cardiologist Physician',
    council_type: 'CRM',
    council_number: '123456',
    council_uf: 'SP',
    primary_specialty: 'Cardiology & Internal Medicine',
    phone: '(11) 98111-2233',
    email: 'carlos.mendes@openclinic.com.br',
    is_clinical_staff: true,
    is_active: true,
    created_at: '2026-01-05T09:00:00Z',
    updated_at: '2026-08-20T11:00:00Z',
  },
  {
    id: 'practitioner-002-uuid-22bb-33cc',
    tenant_id: 'default-tenant',
    user_id: 'usr-mariana-albuquerque',
    full_name: 'Dra. Mariana Albuquerque',
    cpf: '222.333.444-55',
    practitioner_type: 'CLINICAL',
    job_title: 'Head Nurse / Triage',
    council_type: 'COREN',
    council_number: '654321',
    council_uf: 'SP',
    primary_specialty: 'Emergency & General Nursing',
    phone: '(11) 98222-3344',
    email: 'mariana.albuquerque@openclinic.com.br',
    is_clinical_staff: true,
    is_active: true,
    created_at: '2026-01-10T10:30:00Z',
    updated_at: '2026-08-22T14:15:00Z',
  },
  {
    id: 'practitioner-003-uuid-33cc-44dd',
    tenant_id: 'default-tenant',
    user_id: 'usr-andre-silva',
    full_name: 'André Santos Silva',
    cpf: '333.444.555-66',
    practitioner_type: 'MANAGEMENT',
    job_title: 'Administrative & Financial Director',
    council_type: 'CRA',
    council_number: '98765',
    council_uf: 'SP',
    primary_specialty: 'Hospital Management & Governance',
    phone: '(11) 98333-4455',
    email: 'andre.silva@openclinic.com.br',
    is_clinical_staff: false,
    is_active: true,
    created_at: '2026-01-02T08:00:00Z',
    updated_at: '2026-08-15T16:40:00Z',
  },
  {
    id: 'practitioner-004-uuid-44dd-55ee',
    tenant_id: 'default-tenant',
    user_id: 'usr-beatriz-lima',
    full_name: 'Beatriz Vasconcelos Lima',
    cpf: '444.555.666-77',
    practitioner_type: 'ADMINISTRATIVE',
    job_title: 'Receptionist & TISS Billing Specialist',
    council_type: null,
    council_number: null,
    council_uf: null,
    primary_specialty: 'Customer Service & Billing',
    phone: '(11) 98444-5566',
    email: 'beatriz.lima@openclinic.com.br',
    is_clinical_staff: false,
    is_active: true,
    created_at: '2026-02-01T11:00:00Z',
    updated_at: '2026-08-10T09:20:00Z',
  },
];

export const PractitionersView: React.FC = () => {
  const { t } = useTranslation();

  const [practitioners, setPractitioners] = useState<ApiPractitioner[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRACTITIONERS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return INITIAL_PRACTITIONERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRACTITIONERS, JSON.stringify(practitioners));
    } catch {
      // ignore
    }
  }, [practitioners]);



  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterOnlyClinical, setFilterOnlyClinical] = useState(false);

  const [feedback, setFeedback] = useState<{ type: AlertBannerType; msg: string } | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPractitioner, setEditingPractitioner] = useState<ApiPractitioner | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'DELETE' | 'DEACTIVATE' | 'ACTIVATE';
    practitioner: ApiPractitioner;
  } | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    practitioner_type: 'CLINICAL',
    job_title: '',
    council_type: 'CRM',
    council_number: '',
    council_uf: 'SP',
    primary_specialty: '',
    phone: '',
    email: '',
    is_clinical_staff: true,
  });

  const handleOpenCreateModal = () => {
    setEditingPractitioner(null);
    setFormData({
      full_name: '',
      cpf: '',
      practitioner_type: 'CLINICAL',
      job_title: '',
      council_type: 'CRM',
      council_number: '',
      council_uf: 'SP',
      primary_specialty: '',
      phone: '',
      email: '',
      is_clinical_staff: true,
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (p: ApiPractitioner) => {
    setEditingPractitioner(p);
    setFormData({
      full_name: p.full_name,
      cpf: p.cpf || '',
      practitioner_type: p.practitioner_type || 'CLINICAL',
      job_title: p.job_title || '',
      council_type: p.council_type || 'CRM',
      council_number: p.council_number || '',
      council_uf: p.council_uf || 'SP',
      primary_specialty: p.primary_specialty || '',
      phone: p.phone || '',
      email: p.email || '',
      is_clinical_staff: p.is_clinical_staff,
    });
    setIsFormModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setFeedback({ type: AlertBannerType.ERROR, msg: 'Full name is required.' });
      return;
    }

    if (editingPractitioner) {
      setPractitioners((prev) =>
        prev.map((item) =>
          item.id === editingPractitioner.id
            ? {
                ...item,
                full_name: formData.full_name.trim(),
                cpf: formData.cpf.trim() || null,
                practitioner_type: formData.practitioner_type,
                job_title: formData.job_title.trim() || null,
                council_type: formData.council_type.trim() || null,
                council_number: formData.council_number.trim() || null,
                council_uf: formData.council_uf.trim() || null,
                primary_specialty: formData.primary_specialty.trim() || null,
                phone: formData.phone.trim() || null,
                email: formData.email.trim() || null,
                is_clinical_staff: formData.is_clinical_staff,
                updated_at: new Date().toISOString(),
              }
            : item
        )
      );
      setFeedback({ type: AlertBannerType.SUCCESS, msg: t('PRACTITIONER_SAVED_SUCCESS') });
    } else {
      const newP: ApiPractitioner = {
        id: `practitioner-${Date.now()}`,
        tenant_id: 'default-tenant',
        user_id: null,
        full_name: formData.full_name.trim(),
        cpf: formData.cpf.trim() || null,
        practitioner_type: formData.practitioner_type,
        job_title: formData.job_title.trim() || null,
        council_type: formData.council_type.trim() || null,
        council_number: formData.council_number.trim() || null,
        council_uf: formData.council_uf.trim() || null,
        primary_specialty: formData.primary_specialty.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        is_clinical_staff: formData.is_clinical_staff,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPractitioners((prev) => [newP, ...prev]);
      setFeedback({ type: AlertBannerType.SUCCESS, msg: t('PRACTITIONER_SAVED_SUCCESS') });
    }

    setIsFormModalOpen(false);
  };

  const handleExecuteConfirmAction = () => {
    if (!confirmAction) return;
    const { type, practitioner } = confirmAction;

    if (type === 'DELETE') {
      setPractitioners((prev) => prev.filter((p) => p.id !== practitioner.id));
      setFeedback({ type: AlertBannerType.SUCCESS, msg: t('PRACTITIONER_DELETED_SUCCESS') });
    } else if (type === 'DEACTIVATE') {
      setPractitioners((prev) =>
        prev.map((p) => (p.id === practitioner.id ? { ...p, is_active: false, updated_at: new Date().toISOString() } : p))
      );
      setFeedback({ type: AlertBannerType.SUCCESS, msg: t('PRACTITIONER_STATUS_TOGGLED_SUCCESS') });
    } else if (type === 'ACTIVATE') {
      setPractitioners((prev) =>
        prev.map((p) => (p.id === practitioner.id ? { ...p, is_active: true, updated_at: new Date().toISOString() } : p))
      );
      setFeedback({ type: AlertBannerType.SUCCESS, msg: t('PRACTITIONER_STATUS_TOGGLED_SUCCESS') });
    }

    setConfirmAction(null);
  };

  const filteredPractitioners = useMemo(() => {
    return practitioners.filter((p) => {
      if (filterStatus === 'ACTIVE' && !p.is_active) return false;
      if (filterStatus === 'INACTIVE' && p.is_active) return false;
      if (filterOnlyClinical && !p.is_clinical_staff) return false;
      if (filterType !== 'ALL' && p.practitioner_type !== filterType) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = p.full_name.toLowerCase().includes(term);
        const matchCpf = (p.cpf || '').includes(term);
        const matchEmail = (p.email || '').toLowerCase().includes(term);
        const matchCouncil = (p.council_number || '').includes(term);
        const matchSpecialty = (p.primary_specialty || '').toLowerCase().includes(term);
        if (!matchName && !matchCpf && !matchEmail && !matchCouncil && !matchSpecialty) {
          return false;
        }
      }
      return true;
    });
  }, [practitioners, searchTerm, filterType, filterStatus, filterOnlyClinical]);

  const renderCategoryBadge = (type: string) => {
    switch (type) {
      case 'CLINICAL':
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>🩺 {t('PRACTITIONER_TYPE_CLINICAL')}</span>;
      case 'MANAGEMENT':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>💼 {t('PRACTITIONER_TYPE_MANAGEMENT')}</span>;
      case 'OPERATIONAL':
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>⚙️ {t('PRACTITIONER_TYPE_OPERATIONAL')}</span>;
      default:
        return <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>📋 {t('PRACTITIONER_TYPE_ADMINISTRATIVE')}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {feedback && (
        <AlertBanner
          type={feedback.type}
          message={feedback.msg}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Header Card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
              {t('PRACTITIONER_MANAGEMENT_TITLE')}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.80rem', color: '#64748b' }}>
              {t('PRACTITIONER_MANAGEMENT_SUBTITLE')}
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ➕ {t('PRACTITIONER_BTN_NEW')}
          </button>
        </div>

        {/* Filters Bar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <input
            type="text"
            placeholder={t('GLOBAL_PLACEHOLDER_SEARCH')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: '1 1 200px',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
            }}
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}
          >
            <option value="ALL">{t('PRACTITIONER_FILTER_ALL')}</option>
            <option value="CLINICAL">{t('PRACTITIONER_TYPE_CLINICAL')}</option>
            <option value="ADMINISTRATIVE">{t('PRACTITIONER_TYPE_ADMINISTRATIVE')}</option>
            <option value="MANAGEMENT">{t('PRACTITIONER_TYPE_MANAGEMENT')}</option>
            <option value="OPERATIONAL">{t('PRACTITIONER_TYPE_OPERATIONAL')}</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}
          >
            <option value="ALL">{t('GLOBAL_LABEL_STATUS')}: All</option>
            <option value="ACTIVE">{t('GLOBAL_STATUS_ACTIVE')}</option>
            <option value="INACTIVE">{t('GLOBAL_STATUS_INACTIVE')}</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterOnlyClinical}
              onChange={(e) => setFilterOnlyClinical(e.target.checked)}
            />
            {t('PRACTITIONER_FILTER_ONLY_CLINICAL')}
          </label>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>{t('TABLE_HEADER_NAME')}</th>
                <th style={{ padding: '10px 14px' }}>{t('PRACTITIONER_FIELD_TYPE')}</th>
                <th style={{ padding: '10px 14px' }}>{t('PRACTITIONER_FIELD_COUNCIL_TYPE')} / {t('PRACTITIONER_FIELD_SPECIALTY')}</th>
                <th style={{ padding: '10px 14px' }}>{t('GLOBAL_LABEL_EMAIL')} / {t('PRACTITIONER_FIELD_PHONE')}</th>
                <th style={{ padding: '10px 14px' }}>{t('TABLE_HEADER_STATUS')}</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>{t('GLOBAL_LABEL_ACTIONS')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPractitioners.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px 14px', textAlign: 'center', color: '#94a3b8' }}>
                    {t('PRACTITIONER_EMPTY_LIST')}
                  </td>
                </tr>
              ) : (
                filteredPractitioners.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {p.job_title || '-'} {p.cpf ? `• CPF: ${p.cpf}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {renderCategoryBadge(p.practitioner_type)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {p.council_number ? (
                        <div style={{ fontWeight: 600, color: '#0284c7' }}>
                          {p.council_type} {p.council_number}-{p.council_uf}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>-</span>
                      )}
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {p.primary_specialty || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ color: '#334155' }}>{p.email || '-'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.phone || '-'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {p.is_active ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                          {t('GLOBAL_STATUS_ACTIVE')}
                        </span>
                      ) : (
                        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                          {t('GLOBAL_STATUS_INACTIVE')}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          ✏️ {t('GLOBAL_BTN_EDIT')}
                        </button>
                        {p.is_active ? (
                          <button
                            onClick={() => setConfirmAction({ type: 'DEACTIVATE', practitioner: p })}
                            style={{
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              color: '#e11d48',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            🔒 Inactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmAction({ type: 'ACTIVATE', practitioner: p })}
                            style={{
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              color: '#16a34a',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            🔓 Activate
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmAction({ type: 'DELETE', practitioner: p })}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          🗑️ {t('GLOBAL_BTN_DELETE')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal (Create / Edit) */}
      {isFormModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
          padding: 20,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 600,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
              {editingPractitioner ? t('PRACTITIONER_MODAL_EDIT_TITLE') : t('PRACTITIONER_MODAL_NEW_TITLE')}
            </h3>

            <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  {t('PRACTITIONER_FIELD_FULL_NAME')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('PRACTITIONER_FIELD_CPF')}
                  </label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('PRACTITIONER_FIELD_TYPE')}
                  </label>
                  <select
                    value={formData.practitioner_type}
                    onChange={(e) => setFormData({ ...formData, practitioner_type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#fff' }}
                  >
                    <option value="CLINICAL">{t('PRACTITIONER_TYPE_CLINICAL')}</option>
                    <option value="ADMINISTRATIVE">{t('PRACTITIONER_TYPE_ADMINISTRATIVE')}</option>
                    <option value="MANAGEMENT">{t('PRACTITIONER_TYPE_MANAGEMENT')}</option>
                    <option value="OPERATIONAL">{t('PRACTITIONER_TYPE_OPERATIONAL')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  {t('PRACTITIONER_FIELD_JOB_TITLE')}
                </label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('PRACTITIONER_FIELD_COUNCIL_TYPE')}
                  </label>
                  <input
                    type="text"
                    value={formData.council_type}
                    onChange={(e) => setFormData({ ...formData, council_type: e.target.value })}
                    placeholder="CRM, COREN..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('PRACTITIONER_FIELD_COUNCIL_NUMBER')}
                  </label>
                  <input
                    type="text"
                    value={formData.council_number}
                    onChange={(e) => setFormData({ ...formData, council_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('PRACTITIONER_FIELD_COUNCIL_UF')}
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.council_uf}
                    onChange={(e) => setFormData({ ...formData, council_uf: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  {t('PRACTITIONER_FIELD_SPECIALTY')}
                </label>
                <input
                  type="text"
                  value={formData.primary_specialty}
                  onChange={(e) => setFormData({ ...formData, primary_specialty: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('PRACTITIONER_FIELD_PHONE')}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('PRACTITIONER_FIELD_EMAIL')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: '#1e293b', cursor: 'pointer', margin: '6px 0' }}>
                <input
                  type="checkbox"
                  checked={formData.is_clinical_staff}
                  onChange={(e) => setFormData({ ...formData, is_clinical_staff: e.target.checked })}
                />
                {t('PRACTITIONER_FIELD_IS_CLINICAL')}
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {t('GLOBAL_BTN_CANCEL')}
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    background: '#0284c7',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {t('GLOBAL_BTN_SAVE')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
          padding: 20,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 440,
            padding: 20,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
              {confirmAction.type === 'DELETE' && t('GLOBAL_CONFIRM_DELETE_TITLE')}
              {confirmAction.type === 'DEACTIVATE' && t('GLOBAL_CONFIRM_DEACTIVATE_TITLE')}
              {confirmAction.type === 'ACTIVATE' && t('GLOBAL_CONFIRM_ACTIVATE_TITLE')}
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#475569' }}>
              {confirmAction.type === 'DELETE' && t('PRACTITIONER_CONFIRM_DELETE')}
              {confirmAction.type === 'DEACTIVATE' && t('PRACTITIONER_CONFIRM_DEACTIVATE')}
              {confirmAction.type === 'ACTIVATE' && t('PRACTITIONER_CONFIRM_ACTIVATE')}{' '}
              <strong style={{ color: '#0f172a' }}>{confirmAction.practitioner.full_name}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {t('GLOBAL_BTN_CANCEL')}
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmAction}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  background: confirmAction.type === 'DELETE' ? '#dc2626' : '#0284c7',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {t('GLOBAL_BTN_CONFIRM')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

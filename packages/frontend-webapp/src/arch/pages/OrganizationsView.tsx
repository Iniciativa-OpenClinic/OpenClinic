import React, { useState, useMemo } from 'react';
import { useI18n } from '../../i18n/index.js';
import {
  Cnpj,
  Cnes,
  Cep,
  Phone,
  Email,
  Name,
  Uf,
  Country,
  Website,
  BRAZILIAN_UFS,
  BRAZILIAN_UF_NAMES,
} from '@openclinic/core/shared';
import { AlertBanner, AlertBannerType } from '../../components/AlertBanner.js';
import { FieldLabelWithTooltip, ToggleSwitch } from '../components/FormControls.js';

export interface OrganizationData {
  id: string;
  legalName: string;
  tradeName: string;
  taxId?: string;
  cnpj: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  email?: string;
  phone?: string;
  website?: string;
  postalCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  isActive: boolean;
}

export interface OrganizationUnitData {
  id: string;
  organizationId: string;
  name: string;
  tradeName?: string;
  cnesCode: string;
  taxId?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  isHeadquarters: boolean;
  isActive: boolean;
}

const INITIAL_ORGANIZATION: OrganizationData = {
  id: 'org-001',
  legalName: 'Clínica Exemplo Serviços Médicos e Hospitalares Ltda.',
  tradeName: 'Centro Médico Exemplo & Diagnóstico',
  taxId: 'BR-12345678000190',
  cnpj: '12345678000190',
  stateRegistration: '110.220.330.440',
  municipalRegistration: '987654-1',
  email: 'diretoria@exemplo.com.br',
  phone: '(11) 3000-0000',
  website: 'https://www.exemplo.com.br',
  postalCode: '01310100',
  street: 'Av. Paulista',
  number: '1000',
  complement: '15º andar - Conjunto 1501',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  country: 'BRA',
  isActive: true,
};

const INITIAL_UNITS: OrganizationUnitData[] = [
  {
    id: 'unit-001',
    organizationId: 'org-001',
    name: 'Unidade Principal Paulista (Sede)',
    tradeName: 'Unidade Matriz Exemplo Paulista',
    cnesCode: '9876543',
    taxId: 'BR-12345678000190',
    cnpj: '12345678000190',
    phone: '(11) 3000-0001',
    email: 'atendimento.matriz@exemplo.com.br',
    postalCode: '01310100',
    street: 'Av. Paulista',
    number: '1000',
    complement: 'Térreo e 1º Andar (Ambulatório e Consultórios)',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    country: 'BRA',
    isHeadquarters: true,
    isActive: true,
  },
  {
    id: 'unit-002',
    organizationId: 'org-001',
    name: 'Unidade Avançada Jardins (Filial)',
    tradeName: 'Unidade Filial Exemplo Jardins',
    cnesCode: '8765432',
    taxId: 'BR-12345678000271',
    cnpj: '12345678000271',
    phone: '(11) 3100-0002',
    email: 'recepcao.filial@exemplo.com.br',
    postalCode: '01423000',
    street: 'Rua Oscar Freire',
    number: '450',
    complement: 'Edifício Medical Suites',
    neighborhood: 'Cerqueira César',
    city: 'São Paulo',
    state: 'SP',
    country: 'BRA',
    isHeadquarters: false,
    isActive: true,
  },
];

export const OrganizationsView: React.FC = () => {
  const { t, locale } = useI18n();

  // Primary state
  const [org, setOrg] = useState<OrganizationData>(INITIAL_ORGANIZATION);
  const [units, setUnits] = useState<OrganizationUnitData[]>(INITIAL_UNITS);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'ORGANIZATION' | 'UNITS'>('ORGANIZATION');

  // Notifications feedback
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal Organization State
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [orgFormData, setOrgFormData] = useState<OrganizationData>(INITIAL_ORGANIZATION);
  const [orgErrors, setOrgErrors] = useState<Record<string, string>>({});
  const [orgTouched, setOrgTouched] = useState<Record<string, boolean>>({});
  const [orgSaving, setOrgSaving] = useState(false);

  // Modal Unit State
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitFormData, setUnitFormData] = useState<Partial<OrganizationUnitData>>({});
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitErrors, setUnitErrors] = useState<Record<string, string>>({});
  const [unitTouched, setUnitTouched] = useState<Record<string, boolean>>({});
  const [unitSaving, setUnitSaving] = useState(false);

  // Delete Unit Confirmation Modal State
  const [unitToDelete, setUnitToDelete] = useState<OrganizationUnitData | null>(null);
  const [deleteUnitLoading, setDeleteUnitLoading] = useState(false);

  // Available countries
  const countryOptions = useMemo(() => {
    return Country.getAllCountries();
  }, []);

  // ── Validation Helpers ──

  const validateOrgField = (field: string, val: unknown): string => {
    switch (field) {
      case 'legalName': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        if (trimmed.length < 2 || trimmed.length > 150) return t('VALIDATION_ERROR_NAME_INVALID');
        return '';
      }
      case 'tradeName': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        if (trimmed.length < 2 || trimmed.length > 150) return t('VALIDATION_ERROR_NAME_INVALID');
        return '';
      }
      case 'cnpj': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        const cleaned = Cnpj.clean(trimmed);
        if (!Cnpj.isValid(cleaned)) return t('VALIDATION_ERROR_CNPJ_INVALID');
        return '';
      }
      case 'taxId': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed && trimmed.length > 30) return t('VALIDATION_ERROR_TAX_ID_INVALID');
        return '';
      }
      case 'phone': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed) {
          const cleaned = Phone.clean(trimmed);
          if (!Phone.isValid(cleaned)) return t('VALIDATION_ERROR_PHONE_INVALID');
        }
        return '';
      }
      case 'email': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed && !Email.isValid(trimmed)) return t('VALIDATION_ERROR_EMAIL_INVALID');
        return '';
      }
      case 'website': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed && !Website.isValid(trimmed)) return t('VALIDATION_ERROR_URL_INVALID');
        return '';
      }
      case 'postalCode': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed) {
          const cleaned = Cep.clean(trimmed);
          if (!Cep.isValid(cleaned)) return t('VALIDATION_ERROR_CEP_INVALID');
        }
        return '';
      }
      case 'state': {
        const trimmed = typeof val === 'string' ? val.trim().toUpperCase() : '';
        if (trimmed && !Uf.isValid(trimmed)) return t('VALIDATION_ERROR_UF_INVALID');
        return '';
      }
      default:
        return '';
    }
  };

  const validateOrgForm = (data: OrganizationData): Record<string, string> => {
    const errors: Record<string, string> = {};
    const legalNameErr = validateOrgField('legalName', data.legalName);
    if (legalNameErr) errors.legalName = legalNameErr;

    const tradeNameErr = validateOrgField('tradeName', data.tradeName);
    if (tradeNameErr) errors.tradeName = tradeNameErr;

    const cnpjErr = validateOrgField('cnpj', data.cnpj);
    if (cnpjErr) errors.cnpj = cnpjErr;

    if (data.taxId) {
      const taxIdErr = validateOrgField('taxId', data.taxId);
      if (taxIdErr) errors.taxId = taxIdErr;
    }

    if (data.phone) {
      const phoneErr = validateOrgField('phone', data.phone);
      if (phoneErr) errors.phone = phoneErr;
    }

    if (data.email) {
      const emailErr = validateOrgField('email', data.email);
      if (emailErr) errors.email = emailErr;
    }

    if (data.website) {
      const websiteErr = validateOrgField('website', data.website);
      if (websiteErr) errors.website = websiteErr;
    }

    if (data.postalCode) {
      const postalErr = validateOrgField('postalCode', data.postalCode);
      if (postalErr) errors.postalCode = postalErr;
    }

    if (data.state && data.country === 'BRA') {
      const stateErr = validateOrgField('state', data.state);
      if (stateErr) errors.state = stateErr;
    }

    return errors;
  };

  const validateUnitField = (field: string, val: unknown): string => {
    switch (field) {
      case 'name': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        if (trimmed.length < 2 || trimmed.length > 120) return t('VALIDATION_ERROR_NAME_INVALID');
        return '';
      }
      case 'tradeName': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed && trimmed.length > 120) return t('VALIDATION_ERROR_NAME_INVALID');
        return '';
      }
      case 'cnesCode': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        const cleaned = Cnes.clean(trimmed);
        if (!Cnes.isValid(cleaned)) return t('VALIDATION_ERROR_CNES_INVALID');
        return '';
      }
      case 'cnpj': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed) {
          const cleaned = Cnpj.clean(trimmed);
          if (!Cnpj.isValid(cleaned)) return t('VALIDATION_ERROR_CNPJ_INVALID');
        }
        return '';
      }
      case 'phone': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed) {
          const cleaned = Phone.clean(trimmed);
          if (!Phone.isValid(cleaned)) return t('VALIDATION_ERROR_PHONE_INVALID');
        }
        return '';
      }
      case 'email': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed && !Email.isValid(trimmed)) return t('VALIDATION_ERROR_EMAIL_INVALID');
        return '';
      }
      case 'postalCode': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed) {
          const cleaned = Cep.clean(trimmed);
          if (!Cep.isValid(cleaned)) return t('VALIDATION_ERROR_CEP_INVALID');
        }
        return '';
      }
      case 'state': {
        const trimmed = typeof val === 'string' ? val.trim().toUpperCase() : '';
        if (trimmed && !Uf.isValid(trimmed)) return t('VALIDATION_ERROR_UF_INVALID');
        return '';
      }
      default:
        return '';
    }
  };

  const validateUnitForm = (data: Partial<OrganizationUnitData>): Record<string, string> => {
    const errors: Record<string, string> = {};
    const nameErr = validateUnitField('name', data.name);
    if (nameErr) errors.name = nameErr;

    const cnesErr = validateUnitField('cnesCode', data.cnesCode);
    if (cnesErr) errors.cnesCode = cnesErr;

    if (data.tradeName) {
      const tradeNameErr = validateUnitField('tradeName', data.tradeName);
      if (tradeNameErr) errors.tradeName = tradeNameErr;
    }

    if (data.cnpj) {
      const cnpjErr = validateUnitField('cnpj', data.cnpj);
      if (cnpjErr) errors.cnpj = cnpjErr;
    }

    if (data.phone) {
      const phoneErr = validateUnitField('phone', data.phone);
      if (phoneErr) errors.phone = phoneErr;
    }

    if (data.email) {
      const emailErr = validateUnitField('email', data.email);
      if (emailErr) errors.email = emailErr;
    }

    if (data.postalCode) {
      const postalErr = validateUnitField('postalCode', data.postalCode);
      if (postalErr) errors.postalCode = postalErr;
    }

    if (data.state && (data.country === 'BRA' || !data.country)) {
      const stateErr = validateUnitField('state', data.state);
      if (stateErr) errors.state = stateErr;
    }

    return errors;
  };

  // ── Input Styling Helpers ──

  const getInputStyle = (hasError: boolean) => ({
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: hasError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
    background: hasError ? '#fef2f2' : '#ffffff',
    fontSize: '0.84rem',
    boxSizing: 'border-box' as const,
    outline: 'none',
    transition: 'border-color 0.2s, background-color 0.2s',
  });

  const renderFieldError = (error?: string) => {
    if (!error) return null;
    return (
      <span style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: 3, display: 'block' }}>
        {error}
      </span>
    );
  };

  // ── Organization Form Handlers ──

  const handleOpenOrgModal = () => {
    setOrgFormData({
      ...org,
      cnpj: Cnpj.format(org.cnpj),
      postalCode: org.postalCode ? Cep.format(org.postalCode) : '',
      phone: org.phone ? Phone.format(org.phone) : '',
    });
    setOrgErrors({});
    setOrgTouched({});
    setIsOrgModalOpen(true);
  };

  const handleOrgBlur = (field: string) => {
    setOrgTouched((prev) => ({ ...prev, [field]: true }));
    const val = (orgFormData as unknown as Record<string, unknown>)[field];
    const err = validateOrgField(field, val);
    setOrgErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleOrgChange = (field: string, val: unknown) => {
    setOrgFormData((prev) => ({ ...prev, [field]: val }));
    if (orgTouched[field] || orgErrors[field]) {
      const err = validateOrgField(field, val);
      setOrgErrors((prev) => {
        const next = { ...prev };
        if (err) next[field] = err;
        else delete next[field];
        return next;
      });
    }
  };

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg(null);
    setActionError(null);

    setOrgTouched({
      legalName: true,
      tradeName: true,
      cnpj: true,
      taxId: true,
      phone: true,
      email: true,
      website: true,
      postalCode: true,
      state: true,
    });

    const errors = validateOrgForm(orgFormData);
    if (Object.keys(errors).length > 0) {
      setOrgErrors(errors);
      return;
    }

    setOrgSaving(true);
    setTimeout(() => {
      setOrg({
        ...orgFormData,
        cnpj: Cnpj.clean(orgFormData.cnpj),
        postalCode: orgFormData.postalCode ? Cep.clean(orgFormData.postalCode) : undefined,
        phone: orgFormData.phone ? Phone.clean(orgFormData.phone) : undefined,
        website: orgFormData.website ? Website.clean(orgFormData.website) : undefined,
      });
      setOrgSaving(false);
      setIsOrgModalOpen(false);
      setActionMsg(t('ORG_MSG_SAVE_SUCCESS'));
    }, 250);
  };

  // ── Unit Form Handlers ──

  const handleOpenCreateUnitModal = () => {
    setEditingUnitId(null);
    setUnitFormData({
      organizationId: org.id,
      name: '',
      tradeName: '',
      cnesCode: '',
      taxId: '',
      cnpj: Cnpj.format(org.cnpj),
      phone: '',
      email: '',
      postalCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: org.city || '',
      state: org.state || 'SP',
      country: org.country || 'BRA',
      isHeadquarters: false,
      isActive: true,
    });
    setUnitErrors({});
    setUnitTouched({});
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnitModal = (unit: OrganizationUnitData) => {
    setEditingUnitId(unit.id);
    setUnitFormData({
      ...unit,
      cnpj: unit.cnpj ? Cnpj.format(unit.cnpj) : '',
      postalCode: unit.postalCode ? Cep.format(unit.postalCode) : '',
      phone: unit.phone ? Phone.format(unit.phone) : '',
    });
    setUnitErrors({});
    setUnitTouched({});
    setIsUnitModalOpen(true);
  };

  const handleUnitBlur = (field: string) => {
    setUnitTouched((prev) => ({ ...prev, [field]: true }));
    const val = (unitFormData as unknown as Record<string, unknown>)[field];
    const err = validateUnitField(field, val);
    setUnitErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleUnitChange = (field: string, val: unknown) => {
    setUnitFormData((prev) => ({ ...prev, [field]: val }));
    if (unitTouched[field] || unitErrors[field]) {
      const err = validateUnitField(field, val);
      setUnitErrors((prev) => {
        const next = { ...prev };
        if (err) next[field] = err;
        else delete next[field];
        return next;
      });
    }
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg(null);
    setActionError(null);

    setUnitTouched({
      name: true,
      tradeName: true,
      cnesCode: true,
      cnpj: true,
      phone: true,
      email: true,
      postalCode: true,
      state: true,
    });

    const errors = validateUnitForm(unitFormData);
    if (Object.keys(errors).length > 0) {
      setUnitErrors(errors);
      return;
    }

    setUnitSaving(true);
    setTimeout(() => {
      const cleanedData: OrganizationUnitData = {
        id: editingUnitId || `unit-${Date.now()}`,
        organizationId: org.id,
        name: Name.clean(unitFormData.name || ''),
        tradeName: unitFormData.tradeName ? Name.clean(unitFormData.tradeName) : undefined,
        cnesCode: Cnes.clean(unitFormData.cnesCode || ''),
        taxId: unitFormData.taxId?.trim() || undefined,
        cnpj: unitFormData.cnpj ? Cnpj.clean(unitFormData.cnpj) : undefined,
        phone: unitFormData.phone ? Phone.clean(unitFormData.phone) : undefined,
        email: unitFormData.email?.trim() || undefined,
        postalCode: unitFormData.postalCode ? Cep.clean(unitFormData.postalCode) : undefined,
        street: unitFormData.street?.trim() || undefined,
        number: unitFormData.number?.trim() || undefined,
        complement: unitFormData.complement?.trim() || undefined,
        neighborhood: unitFormData.neighborhood?.trim() || undefined,
        city: unitFormData.city?.trim() || undefined,
        state: unitFormData.state?.trim().toUpperCase() || undefined,
        country: unitFormData.country || 'BRA',
        isHeadquarters: Boolean(unitFormData.isHeadquarters),
        isActive: Boolean(unitFormData.isActive ?? true),
      };

      if (editingUnitId) {
        setUnits((prev) =>
          prev.map((item) => (item.id === editingUnitId ? cleanedData : item))
        );
        setActionMsg(t('UNIT_MSG_UPDATE_SUCCESS'));
      } else {
        // If new unit is marked as headquarters, update previous headquarters
        if (cleanedData.isHeadquarters) {
          setUnits((prev) => [
            ...prev.map((u) => (u.isHeadquarters ? { ...u, isHeadquarters: false } : u)),
            cleanedData,
          ]);
        } else {
          setUnits((prev) => [...prev, cleanedData]);
        }
        setActionMsg(t('UNIT_MSG_CREATE_SUCCESS'));
      }

      setUnitSaving(false);
      setIsUnitModalOpen(false);
    }, 250);
  };

  // ── Delete Unit Handlers ──

  const handleConfirmDeleteUnit = () => {
    if (!unitToDelete) return;
    setDeleteUnitLoading(true);
    setTimeout(() => {
      setUnits((prev) => prev.filter((item) => item.id !== unitToDelete.id));
      setDeleteUnitLoading(false);
      setUnitToDelete(null);
      setIsUnitModalOpen(false);
      setActionMsg(t('UNIT_MSG_DELETE_SUCCESS'));
    }, 250);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Alert Banner */}
      {actionMsg && (
        <AlertBanner
          type={AlertBannerType.SUCCESS}
          message={actionMsg}
          onClose={() => setActionMsg(null)}
        />
      )}
      {actionError && (
        <AlertBanner
          type={AlertBannerType.ERROR}
          message={actionError}
          onClose={() => setActionError(null)}
        />
      )}

      {/* Main Container Card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.1rem', fontWeight: 700 }}>
              🏥 {t('ORG_VIEW_TITLE')}
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
              {t('ORG_VIEW_SUBTITLE')}
            </p>
          </div>

          {/* Navigation Pills */}
          <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab('ORGANIZATION')}
              style={{
                background: activeTab === 'ORGANIZATION' ? '#fff' : 'transparent',
                color: activeTab === 'ORGANIZATION' ? '#0284c7' : '#64748b',
                fontWeight: activeTab === 'ORGANIZATION' ? 700 : 500,
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'ORGANIZATION' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              🏢 {t('ORG_TAB_ORGANIZATION')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UNITS')}
              style={{
                background: activeTab === 'UNITS' ? '#fff' : 'transparent',
                color: activeTab === 'UNITS' ? '#0284c7' : '#64748b',
                fontWeight: activeTab === 'UNITS' ? 700 : 500,
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'UNITS' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              📍 {t('ORG_TAB_UNITS')} ({units.length})
            </button>
          </div>
        </div>

        {/* ── TAB 1: Organization ── */}
        {activeTab === 'ORGANIZATION' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                {t('ORG_CARD_CORPORATE_TITLE')}
              </div>
              <button
                type="button"
                onClick={handleOpenOrgModal}
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span>✏️</span>
                <span>{t('ORG_BTN_EDIT_ORGANIZATION')}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {/* Card 1: Legal Identification */}
              <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                  {t('ORG_SECTION_LEGAL')}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('ORG_FIELD_LEGAL_NAME_LABEL')}</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{org.legalName}</div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('ORG_FIELD_TRADE_NAME_LABEL')}</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#334155' }}>{org.tradeName}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                  <span
                    style={{
                      background: org.isActive ? '#ecfdf5' : '#fff1f2',
                      color: org.isActive ? '#059669' : '#e11d48',
                      border: `1px solid ${org.isActive ? '#a7f3d0' : '#fecdd3'}`,
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    {org.isActive ? t('GLOBAL_STATUS_ACTIVE') : t('GLOBAL_STATUS_INACTIVE')}
                  </span>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6, fontSize: '0.74rem', fontFamily: 'monospace' }}>
                    ID: {org.id}
                  </span>
                </div>
              </div>

              {/* Card 2: Tax & Regulatory Records */}
              <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                  {t('ORG_SECTION_REGULATORY')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('ORG_FIELD_CNPJ_LABEL')}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                      {Cnpj.format(org.cnpj)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('ORG_FIELD_TAX_ID_LABEL')}</div>
                    <div style={{ fontSize: '0.84rem', color: '#334155' }}>{org.taxId || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('ORG_FIELD_STATE_REG_LABEL')}</div>
                    <div style={{ fontSize: '0.84rem', color: '#334155' }}>{org.stateRegistration || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('ORG_FIELD_MUNICIPAL_REG_LABEL')}</div>
                    <div style={{ fontSize: '0.84rem', color: '#334155' }}>{org.municipalRegistration || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Card 3: Headquarters Address */}
              <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                  {t('ORG_SECTION_ADDRESS')}
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  {org.street || '-'}, {org.number || 'S/N'} {org.complement ? `• ${org.complement}` : ''}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: 4 }}>
                  {org.neighborhood || '-'} — {[org.city, org.state ? Uf.format(org.state) : null].filter(Boolean).join(' / ') || '-'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {t('ORG_FIELD_POSTAL_CODE_LABEL')}: {org.postalCode ? Cep.format(org.postalCode) : '-'} • {t('ORG_FIELD_COUNTRY_LABEL')}: {org.country || 'BRA'}
                </div>
              </div>

              {/* Card 4: Communication Channels */}
              <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.04em' }}>
                  {t('ORG_SECTION_CONTACT')}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 6 }}>
                  📞 <strong>{t('ORG_FIELD_PHONE_LABEL')}:</strong> {org.phone ? Phone.format(org.phone) : '-'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 6 }}>
                  ✉️ <strong>{t('ORG_FIELD_EMAIL_LABEL')}:</strong> {org.email || '-'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                  🌐 <strong>{t('ORG_FIELD_WEBSITE_LABEL')}:</strong>{' '}
                  {org.website ? (
                    <a
                      href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#0284c7', textDecoration: 'none' }}
                    >
                      {org.website}
                    </a>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: Unidades de Atendimento ── */}
        {activeTab === 'UNITS' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                {t('ORG_CARD_UNITS_TITLE')}
              </div>
              <button
                type="button"
                onClick={handleOpenCreateUnitModal}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span>➕</span>
                <span>{t('ORG_BTN_NEW_UNIT')}</span>
              </button>
            </div>

            {units.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                  color: '#64748b',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px dashed #cbd5e1',
                }}
              >
                {t('UNIT_EMPTY_LIST')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px', fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                            {unit.name}
                          </h4>
                          {unit.tradeName && (
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{unit.tradeName}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {unit.isHeadquarters ? (
                            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                              {t('UNIT_BADGE_HEADQUARTERS')}
                            </span>
                          ) : (
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600 }}>
                              {t('UNIT_BADGE_BRANCH')}
                            </span>
                          )}
                          <span
                            style={{
                              background: unit.isActive ? '#ecfdf5' : '#fff1f2',
                              color: unit.isActive ? '#059669' : '#e11d48',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {unit.isActive ? t('GLOBAL_STATUS_ACTIVE') : t('GLOBAL_STATUS_INACTIVE')}
                          </span>
                        </div>
                      </div>

                      {/* CNES & CNPJ Badges */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                          CNES: {unit.cnesCode}
                        </span>
                        {unit.cnpj && (
                          <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            CNPJ: {Cnpj.format(unit.cnpj)}
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 10 }}>
                        <div style={{ fontWeight: 600 }}>
                          📍 {unit.street || '-'}, {unit.number || 'S/N'} {unit.complement ? `(${unit.complement})` : ''}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>
                          {unit.neighborhood || '-'} — {[unit.city, unit.state ? Uf.format(unit.state) : null].filter(Boolean).join(' / ') || '-'} • CEP: {unit.postalCode ? Cep.format(unit.postalCode) : '-'}
                        </div>
                      </div>

                      {/* Contato */}
                      <div style={{ fontSize: '0.8rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                        <div>📞 {unit.phone ? Phone.format(unit.phone) : '-'}</div>
                        <div>✉️ {unit.email || '-'}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditUnitModal(unit)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#0284c7',
                          borderRadius: 6,
                          padding: '5px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>✏️</span>
                        <span>{t('UNIT_BTN_EDIT')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL 1: EDIT ORGANIZATION DATA ── */}
      {isOrgModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 820,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                🏢 {t('ORG_MODAL_EDIT_TITLE')}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ToggleSwitch
                  checked={orgFormData.isActive}
                  onChange={(active) => setOrgFormData((prev) => ({ ...prev, isActive: active }))}
                />
                <button
                  type="button"
                  onClick={() => setIsOrgModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    lineHeight: 1,
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOrg} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* Section 1: Legal Identification */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('ORG_SECTION_LEGAL')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  <div style={{ gridColumn: 'span 7' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_LEGAL_NAME_LABEL')}
                      required
                    />
                    <input
                      type="text"
                      value={orgFormData.legalName}
                      onBlur={() => handleOrgBlur('legalName')}
                      onChange={(e) => handleOrgChange('legalName', e.target.value)}
                      style={getInputStyle(!!orgErrors.legalName)}
                    />
                    {renderFieldError(orgErrors.legalName)}
                  </div>

                  <div style={{ gridColumn: 'span 5' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_TRADE_NAME_LABEL')}
                      required
                    />
                    <input
                      type="text"
                      value={orgFormData.tradeName}
                      onBlur={() => handleOrgBlur('tradeName')}
                      onChange={(e) => handleOrgChange('tradeName', e.target.value)}
                      style={getInputStyle(!!orgErrors.tradeName)}
                    />
                    {renderFieldError(orgErrors.tradeName)}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

              {/* Section 2: Tax & Regulatory Records */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('ORG_SECTION_REGULATORY')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_CNPJ_LABEL')}
                      required
                    />
                    <input
                      type="text"
                      maxLength={18}
                      value={orgFormData.cnpj}
                      onBlur={() => handleOrgBlur('cnpj')}
                      onChange={(e) => handleOrgChange('cnpj', Cnpj.format(e.target.value))}
                      style={{ ...getInputStyle(!!orgErrors.cnpj), fontFamily: 'monospace', maxWidth: 175 }}
                    />
                    {renderFieldError(orgErrors.cnpj)}
                  </div>

                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_TAX_ID_LABEL')}
                      tooltip={t('ORG_FIELD_TAX_ID_TOOLTIP')}
                    />
                    <input
                      type="text"
                      value={orgFormData.taxId || ''}
                      onBlur={() => handleOrgBlur('taxId')}
                      onChange={(e) => handleOrgChange('taxId', e.target.value)}
                      style={getInputStyle(!!orgErrors.taxId)}
                    />
                    {renderFieldError(orgErrors.taxId)}
                  </div>

                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_STATE_REG_LABEL')}
                    />
                    <input
                      type="text"
                      value={orgFormData.stateRegistration || ''}
                      onChange={(e) => handleOrgChange('stateRegistration', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_MUNICIPAL_REG_LABEL')}
                    />
                    <input
                      type="text"
                      value={orgFormData.municipalRegistration || ''}
                      onChange={(e) => handleOrgChange('municipalRegistration', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

              {/* Section 3: Headquarters Address */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('ORG_SECTION_ADDRESS')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_POSTAL_CODE_LABEL')}
                    />
                    <input
                      type="text"
                      maxLength={9}
                      value={orgFormData.postalCode || ''}
                      onBlur={() => handleOrgBlur('postalCode')}
                      onChange={(e) => handleOrgChange('postalCode', Cep.format(e.target.value))}
                      style={{ ...getInputStyle(!!orgErrors.postalCode), fontFamily: 'monospace' }}
                    />
                    {renderFieldError(orgErrors.postalCode)}
                  </div>

                  <div style={{ gridColumn: 'span 7' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_STREET_LABEL')}
                    />
                    <input
                      type="text"
                      value={orgFormData.street || ''}
                      onChange={(e) => handleOrgChange('street', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_NUMBER_LABEL')}
                    />
                    <input
                      type="text"
                      value={orgFormData.number || ''}
                      onChange={(e) => handleOrgChange('number', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 4' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_COMPLEMENT_LABEL')}
                    />
                    <input
                      type="text"
                      value={orgFormData.complement || ''}
                      onChange={(e) => handleOrgChange('complement', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 8' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_NEIGHBORHOOD_LABEL')}
                    />
                    <input
                      type="text"
                      value={orgFormData.neighborhood || ''}
                      onChange={(e) => handleOrgChange('neighborhood', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 5' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_CITY_LABEL')}
                    />
                    <input
                      type="text"
                      value={orgFormData.city || ''}
                      onChange={(e) => handleOrgChange('city', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_STATE_LABEL')}
                    />
                    <select
                      value={orgFormData.state || ''}
                      onBlur={() => handleOrgBlur('state')}
                      onChange={(e) => handleOrgChange('state', e.target.value.toUpperCase())}
                      style={{ ...getInputStyle(!!orgErrors.state), cursor: 'pointer' }}
                    >
                      <option value="">-</option>
                      {BRAZILIAN_UFS.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf} - {BRAZILIAN_UF_NAMES[uf]}
                        </option>
                      ))}
                    </select>
                    {renderFieldError(orgErrors.state)}
                  </div>

                  <div style={{ gridColumn: 'span 4' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_COUNTRY_LABEL')}
                    />
                    <select
                      value={orgFormData.country || 'BRA'}
                      onChange={(e) => handleOrgChange('country', e.target.value)}
                      style={{ ...getInputStyle(false), cursor: 'pointer' }}
                    >
                      {countryOptions.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.display}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

              {/* Section 4: Communication Channels */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('ORG_SECTION_CONTACT')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  <div style={{ gridColumn: 'span 4' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_PHONE_LABEL')}
                    />
                    <input
                      type="text"
                      maxLength={15}
                      value={orgFormData.phone || ''}
                      onBlur={() => handleOrgBlur('phone')}
                      onChange={(e) => handleOrgChange('phone', Phone.format(e.target.value))}
                      style={getInputStyle(!!orgErrors.phone)}
                    />
                    {renderFieldError(orgErrors.phone)}
                  </div>

                  <div style={{ gridColumn: 'span 4' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_EMAIL_LABEL')}
                    />
                    <input
                      type="email"
                      value={orgFormData.email || ''}
                      onBlur={() => handleOrgBlur('email')}
                      onChange={(e) => handleOrgChange('email', e.target.value)}
                      style={getInputStyle(!!orgErrors.email)}
                    />
                    {renderFieldError(orgErrors.email)}
                  </div>

                  <div style={{ gridColumn: 'span 4' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_WEBSITE_LABEL')}
                    />
                    <input
                      type="text"
                      value={orgFormData.website || ''}
                      onBlur={() => handleOrgBlur('website')}
                      onChange={(e) => handleOrgChange('website', e.target.value)}
                      placeholder={t('ORG_FIELD_WEBSITE_PLACEHOLDER')}
                      style={getInputStyle(!!orgErrors.website)}
                    />
                    {renderFieldError(orgErrors.website)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsOrgModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('GLOBAL_BTN_CANCEL')}
                </button>
                <button
                  type="submit"
                  disabled={orgSaving}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: orgSaving ? 'not-allowed' : 'pointer',
                    opacity: orgSaving ? 0.7 : 1,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {orgSaving ? t('BTN_PROCESSING') : t('GLOBAL_BTN_SAVE')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CRIAR / EDITAR UNIDADE DE ATENDIMENTO ── */}
      {isUnitModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 820,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                🏥 {editingUnitId ? t('UNIT_MODAL_EDIT_TITLE') : t('UNIT_MODAL_CREATE_TITLE')}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ToggleSwitch
                  checked={Boolean(unitFormData.isActive ?? true)}
                  onChange={(active) => setUnitFormData((prev) => ({ ...prev, isActive: active }))}
                />
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    lineHeight: 1,
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUnit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* Section 1: Facility Identification */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('UNIT_SECTION_IDENTIFICATION')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  <div style={{ gridColumn: 'span 7' }}>
                    <FieldLabelWithTooltip
                      label={t('UNIT_FIELD_NAME_LABEL')}
                      required
                    />
                    <input
                      type="text"
                      value={unitFormData.name || ''}
                      onBlur={() => handleUnitBlur('name')}
                      onChange={(e) => handleUnitChange('name', e.target.value)}
                      style={getInputStyle(!!unitErrors.name)}
                    />
                    {renderFieldError(unitErrors.name)}
                  </div>

                  <div style={{ gridColumn: 'span 5' }}>
                    <FieldLabelWithTooltip
                      label={t('UNIT_FIELD_TRADE_NAME_LABEL')}
                    />
                    <input
                      type="text"
                      value={unitFormData.tradeName || ''}
                      onBlur={() => handleUnitBlur('tradeName')}
                      onChange={(e) => handleUnitChange('tradeName', e.target.value)}
                      style={getInputStyle(!!unitErrors.tradeName)}
                    />
                    {renderFieldError(unitErrors.tradeName)}
                  </div>

                  <div style={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center', marginTop: 2 }}>
                    <label
                      title={t('UNIT_FIELD_IS_HEADQUARTERS_TOOLTIP')}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(unitFormData.isHeadquarters)}
                        onChange={(e) => setUnitFormData((prev) => ({ ...prev, isHeadquarters: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: '#0284c7' }}
                      />
                      <span style={{ fontWeight: 600 }}>{t('UNIT_FIELD_IS_HEADQUARTERS_LABEL')}</span>
                      <span
                        title={t('UNIT_FIELD_IS_HEADQUARTERS_TOOLTIP')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#e2e8f0',
                          color: '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'help',
                        }}
                      >
                        ℹ️
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

              {/* Section 2: Sanitary & Tax Records */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('UNIT_SECTION_REGULATORY')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('UNIT_FIELD_CNES_LABEL')}
                      tooltip={t('UNIT_FIELD_CNES_TOOLTIP')}
                      required
                    />
                    <input
                      type="text"
                      maxLength={7}
                      value={unitFormData.cnesCode || ''}
                      onBlur={() => handleUnitBlur('cnesCode')}
                      onChange={(e) => handleUnitChange('cnesCode', Cnes.format(e.target.value))}
                      style={{ ...getInputStyle(!!unitErrors.cnesCode), fontFamily: 'monospace' }}
                    />
                    {renderFieldError(unitErrors.cnesCode)}
                  </div>

                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('UNIT_FIELD_CNPJ_LABEL')}
                    />
                    <input
                      type="text"
                      maxLength={18}
                      value={unitFormData.cnpj || ''}
                      onBlur={() => handleUnitBlur('cnpj')}
                      onChange={(e) => handleUnitChange('cnpj', Cnpj.format(e.target.value))}
                      style={{ ...getInputStyle(!!unitErrors.cnpj), fontFamily: 'monospace', maxWidth: 175 }}
                    />
                    {renderFieldError(unitErrors.cnpj)}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

              {/* Section 3: Physical Address */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('UNIT_SECTION_ADDRESS')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_POSTAL_CODE_LABEL')}
                    />
                    <input
                      type="text"
                      maxLength={9}
                      value={unitFormData.postalCode || ''}
                      onBlur={() => handleUnitBlur('postalCode')}
                      onChange={(e) => handleUnitChange('postalCode', Cep.format(e.target.value))}
                      style={{ ...getInputStyle(!!unitErrors.postalCode), fontFamily: 'monospace' }}
                    />
                    {renderFieldError(unitErrors.postalCode)}
                  </div>

                  <div style={{ gridColumn: 'span 7' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_STREET_LABEL')}
                    />
                    <input
                      type="text"
                      value={unitFormData.street || ''}
                      onChange={(e) => handleUnitChange('street', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_NUMBER_LABEL')}
                    />
                    <input
                      type="text"
                      value={unitFormData.number || ''}
                      onChange={(e) => handleUnitChange('number', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 4' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_COMPLEMENT_LABEL')}
                    />
                    <input
                      type="text"
                      value={unitFormData.complement || ''}
                      onChange={(e) => handleUnitChange('complement', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 8' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_NEIGHBORHOOD_LABEL')}
                    />
                    <input
                      type="text"
                      value={unitFormData.neighborhood || ''}
                      onChange={(e) => handleUnitChange('neighborhood', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 5' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_CITY_LABEL')}
                    />
                    <input
                      type="text"
                      value={unitFormData.city || ''}
                      onChange={(e) => handleUnitChange('city', e.target.value)}
                      style={getInputStyle(false)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_STATE_LABEL')}
                    />
                    <select
                      value={unitFormData.state || ''}
                      onBlur={() => handleUnitBlur('state')}
                      onChange={(e) => handleUnitChange('state', e.target.value.toUpperCase())}
                      style={{ ...getInputStyle(!!unitErrors.state), cursor: 'pointer' }}
                    >
                      <option value="">-</option>
                      {BRAZILIAN_UFS.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf} - {BRAZILIAN_UF_NAMES[uf]}
                        </option>
                      ))}
                    </select>
                    {renderFieldError(unitErrors.state)}
                  </div>

                  <div style={{ gridColumn: 'span 4' }}>
                    <FieldLabelWithTooltip
                      label={t('ORG_FIELD_COUNTRY_LABEL')}
                    />
                    <select
                      value={unitFormData.country || 'BRA'}
                      onChange={(e) => handleUnitChange('country', e.target.value)}
                      style={{ ...getInputStyle(false), cursor: 'pointer' }}
                    >
                      {countryOptions.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.display}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

              {/* Section 4: Contacts */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('UNIT_SECTION_CONTACT')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('UNIT_FIELD_PHONE_LABEL')}
                    />
                    <input
                      type="text"
                      maxLength={15}
                      value={unitFormData.phone || ''}
                      onBlur={() => handleUnitBlur('phone')}
                      onChange={(e) => handleUnitChange('phone', Phone.format(e.target.value))}
                      style={getInputStyle(!!unitErrors.phone)}
                    />
                    {renderFieldError(unitErrors.phone)}
                  </div>

                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('UNIT_FIELD_EMAIL_LABEL')}
                    />
                    <input
                      type="email"
                      value={unitFormData.email || ''}
                      onBlur={() => handleUnitBlur('email')}
                      onChange={(e) => handleUnitChange('email', e.target.value)}
                      style={getInputStyle(!!unitErrors.email)}
                    />
                    {renderFieldError(unitErrors.email)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: editingUnitId ? 'space-between' : 'flex-end',
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                {editingUnitId && (
                  <button
                    type="button"
                    disabled={unitFormData.isActive || unitFormData.isHeadquarters}
                    onClick={() => setUnitToDelete(unitFormData as OrganizationUnitData)}
                    title={
                      unitFormData.isHeadquarters
                        ? t('UNIT_TOOLTIP_CANNOT_DELETE_HEADQUARTERS')
                        : unitFormData.isActive
                        ? t('UNIT_TOOLTIP_CANNOT_DELETE_ACTIVE')
                        : t('UNIT_BTN_DELETE')
                    }
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border:
                        unitFormData.isActive || unitFormData.isHeadquarters
                          ? '1px solid #e2e8f0'
                          : '1px solid #fca5a5',
                      background:
                        unitFormData.isActive || unitFormData.isHeadquarters ? '#f1f5f9' : '#fee2e2',
                      color:
                        unitFormData.isActive || unitFormData.isHeadquarters ? '#94a3b8' : '#dc2626',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor:
                        unitFormData.isActive || unitFormData.isHeadquarters
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: unitFormData.isActive || unitFormData.isHeadquarters ? 0.6 : 1,
                    }}
                  >
                    🗑️ {t('UNIT_BTN_DELETE')}
                  </button>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsUnitModalOpen(false)}
                    style={{
                      padding: '9px 18px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#334155',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t('GLOBAL_BTN_CANCEL')}
                  </button>
                  <button
                    type="submit"
                    disabled={unitSaving}
                    style={{
                      padding: '9px 22px',
                      borderRadius: 8,
                      border: 'none',
                      background: editingUnitId ? '#0284c7' : '#16a34a',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: unitSaving ? 'not-allowed' : 'pointer',
                      opacity: unitSaving ? 0.7 : 1,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    {unitSaving ? t('BTN_PROCESSING') : editingUnitId ? t('UNIT_BTN_SAVE') : t('UNIT_BTN_CREATE')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CONFIRM FACILITY DELETION ── */}
      {unitToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: '1.8rem' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
                {t('UNIT_CONFIRM_DELETE_TITLE')}
              </h3>
            </div>
            <p style={{ margin: '0 0 20px', color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {t('UNIT_CONFIRM_DELETE_MSG').replace('{name}', unitToDelete.name)}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setUnitToDelete(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('GLOBAL_BTN_CANCEL')}
              </button>
              <button
                type="button"
                disabled={deleteUnitLoading}
                onClick={handleConfirmDeleteUnit}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: deleteUnitLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteUnitLoading ? 0.7 : 1,
                }}
              >
                {deleteUnitLoading ? t('BTN_PROCESSING') : t('UNIT_BTN_DELETE')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

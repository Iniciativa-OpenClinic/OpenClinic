import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../i18n/index.js';
import {
  getPlatformApplication,
  listTenants,
  createTenant,
  updateTenant,
  type TenantData,
  type TenantPayload,
} from '../../services/api.js';
import {
  Cnpj,
  Cep,
  Uf,
  BRAZILIAN_UFS,
  BRAZILIAN_UF_NAMES,
  Country,
  Phone,
  Email,
  Name,
  TenantStatus,
} from '@openclinic/core/shared';
import { AlertBanner, AlertBannerType } from '../../components/AlertBanner.js';
import { FieldLabelWithTooltip, ToggleSwitch } from '../components/FormControls.js';

export interface TenantsManagementViewProps {
  onNavigateTab?: (tab: string) => void;
}

export type { TenantData } from '../../services/api.js';

export const TenantsManagementView: React.FC<TenantsManagementViewProps> = ({ onNavigateTab }) => {
  const { t } = useI18n();
  const [isMultiTenant, setIsMultiTenant] = useState<boolean>(false);
  const [loadingPlatform, setLoadingPlatform] = useState<boolean>(true);
  const [loadingTenants, setLoadingTenants] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // User notifications
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State and Validation
  const [formData, setFormData] = useState<Partial<TenantData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const loadTenants = async () => {
    setLoadingTenants(true);
    try {
      const data = await listTenants();
      setTenants(data);
    } catch (err: unknown) {
      const errObj = err as { detail?: string; message?: string } | undefined;
      setActionError(errObj?.detail || errObj?.message || t('TENANTS_LOAD_ERROR'));
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getPlatformApplication().catch(() => null),
      listTenants().catch((err) => {
        if (mounted) setActionError(err?.detail || err?.message || t('TENANTS_LOAD_ERROR'));
        return [];
      }),
    ]).then(([app, tenantList]) => {
      if (mounted) {
        if (app) setIsMultiTenant(Boolean(app.isMultiTenant));
        if (tenantList) setTenants(tenantList);
        setLoadingPlatform(false);
        setLoadingTenants(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const primaryTenant = useMemo(() => {
    return tenants.find((item) => item.isDefault) || tenants[0];
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return tenants;
    return tenants.filter((tenant) => {
      const matchName = tenant.name.toLowerCase().includes(term);
      const matchSlug = tenant.slug.toLowerCase().includes(term);
      const matchCnpj = tenant.cnpj?.includes(Cnpj.clean(term));
      const matchCity = tenant.city?.toLowerCase().includes(term);
      return matchName || matchSlug || matchCnpj || matchCity;
    });
  }, [tenants, searchTerm]);

  const countryOptions = useMemo(() => {
    return Country.getAllCountries();
  }, []);

  const isCurrentTenantBrazil = formData.country === 'BRA';

  // Validation function matching UsersManagementView standard
  const validateTenantField = (field: string, val: unknown): string => {
    switch (field) {
      case 'name': {
        const trimmed = typeof val === 'string' ? Name.clean(val) : '';
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        if (trimmed.length < 2 || trimmed.length > 120) {
          return t('VALIDATION_ERROR_NAME_INVALID');
        }
        return '';
      }
      case 'slug': {
        const trimmed = typeof val === 'string' ? val.trim().toLowerCase() : '';
        if (!trimmed) return t('VALIDATION_ERROR_REQUIRED');
        if (!/^[a-z0-9_.-]{2,50}$/.test(trimmed)) {
          return t('VALIDATION_ERROR_SLUG_INVALID');
        }
        return '';
      }
      case 'cnpj': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed) {
          const cleaned = Cnpj.clean(trimmed);
          if (!Cnpj.isValid(cleaned)) {
            return t('VALIDATION_ERROR_CNPJ_INVALID');
          }
        }
        return '';
      }
      case 'contactName': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed && trimmed.length > 255) {
          return t('VALIDATION_ERROR_NAME_INVALID');
        }
        return '';
      }
      case 'contactEmail': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed && !Email.isValid(trimmed)) {
          return t('VALIDATION_ERROR_EMAIL_INVALID');
        }
        return '';
      }
      case 'contactPhone': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed && !Phone.isValid(trimmed)) {
          return t('VALIDATION_ERROR_PHONE_INVALID');
        }
        return '';
      }
      case 'taxId': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed && trimmed.length > 30) {
          return t('VALIDATION_ERROR_TAX_ID_INVALID');
        }
        return '';
      }
      case 'postalCode': {
        const trimmed = typeof val === 'string' ? val.trim() : '';
        if (trimmed) {
          const isBrazil = formData.country === 'BRA';
          if (isBrazil) {
            const cleaned = Cep.clean(trimmed);
            if (!Cep.isValid(cleaned)) {
              return t('VALIDATION_ERROR_CEP_INVALID');
            }
          } else {
            if (trimmed.length > 20) {
              return t('VALIDATION_ERROR_POSTAL_CODE_INVALID');
            }
          }
        }
        return '';
      }
      case 'state': {
        const isBrazil = formData.country === 'BRA';
        if (isBrazil) {
          const trimmed = typeof val === 'string' ? Uf.clean(val) : '';
          if (trimmed && !Uf.isValid(trimmed)) {
            return t('VALIDATION_ERROR_UF_INVALID');
          }
        } else {
          const trimmed = typeof val === 'string' ? val.trim() : '';
          if (trimmed && trimmed.length > 100) {
            return t('VALIDATION_ERROR_STATE_INVALID');
          }
        }
        return '';
      }
      default:
        return '';
    }
  };

  const validateTenantForm = (values: Partial<TenantData>): Record<string, string> => {
    const errs: Record<string, string> = {};

    const nameErr = validateTenantField('name', values.name || '');
    if (nameErr) errs.name = nameErr;

    const slugErr = validateTenantField('slug', values.slug || '');
    if (slugErr) errs.slug = slugErr;

    const cnpjErr = validateTenantField('cnpj', values.cnpj || '');
    if (cnpjErr) errs.cnpj = cnpjErr;

    const contactNameErr = validateTenantField('contactName', values.contactName || '');
    if (contactNameErr) errs.contactName = contactNameErr;

    const contactEmailErr = validateTenantField('contactEmail', values.contactEmail || '');
    if (contactEmailErr) errs.contactEmail = contactEmailErr;

    const contactPhoneErr = validateTenantField('contactPhone', values.contactPhone || '');
    if (contactPhoneErr) errs.contactPhone = contactPhoneErr;

    const taxIdErr = validateTenantField('taxId', values.taxId || '');
    if (taxIdErr) errs.taxId = taxIdErr;

    const postalCodeErr = validateTenantField('postalCode', values.postalCode || '');
    if (postalCodeErr) errs.postalCode = postalCodeErr;

    const stateErr = validateTenantField('state', values.state || '');
    if (stateErr) errs.state = stateErr;

    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = (formData as Record<string, unknown>)[field];
    const err = validateTenantField(field, val);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedTenant(null);
    setFormData({
      name: '',
      slug: '',
      status: TenantStatus.ACTIVE,
      contactName: '',
      contactTitle: '',
      contactEmail: '',
      contactPhone: '',
      taxId: '',
      cnpj: '',
      postalCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      country: '',
      isDefault: tenants.length === 0,
    });
    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tenant: TenantData) => {
    setIsEditing(true);
    setSelectedTenant(tenant);
    const isBrazil = tenant.country === 'BRA';
    setFormData({
      ...tenant,
      cnpj: tenant.cnpj ? Cnpj.format(tenant.cnpj) : '',
      postalCode: tenant.postalCode
        ? (isBrazil ? Cep.format(tenant.postalCode) : tenant.postalCode)
        : '',
      contactPhone: tenant.contactPhone ? Phone.format(tenant.contactPhone) : '',
      country: tenant.country || '',
    });
    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionMsg(null);

    setTouched({
      name: true,
      slug: true,
      cnpj: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      taxId: true,
      postalCode: true,
      state: true,
    });

    const formErrors = validateTenantForm(formData);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    const isBrazil = formData.country === 'BRA';
    const cleanCnpj = formData.cnpj ? Cnpj.clean(formData.cnpj) : undefined;
    const cleanPostal = formData.postalCode
      ? (isBrazil ? Cep.clean(formData.postalCode) : formData.postalCode.trim())
      : undefined;

    setIsSaving(true);
    try {
      const payload: TenantPayload = {
        name: Name.clean(formData.name || ''),
        slug: (formData.slug || '').toLowerCase().trim(),
        status: formData.status || TenantStatus.ACTIVE,
        contactName: formData.contactName?.trim() || null,
        contactTitle: formData.contactTitle?.trim() || null,
        contactEmail: formData.contactEmail?.trim() || null,
        contactPhone: formData.contactPhone ? Phone.clean(formData.contactPhone) : null,
        taxId: formData.taxId?.trim() || null,
        cnpj: cleanCnpj || null,
        postalCode: cleanPostal || null,
        street: formData.street?.trim() || null,
        number: formData.number?.trim() || null,
        complement: formData.complement?.trim() || null,
        neighborhood: formData.neighborhood?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        country: formData.country?.trim() || null,
        isDefault: Boolean(formData.isDefault),
      };

      if (isEditing && selectedTenant) {
        const res = await updateTenant(selectedTenant.id, payload);
        setActionMsg(res.message || t('TENANTS_MSG_UPDATE_SUCCESS'));
      } else {
        const res = await createTenant(payload);
        setActionMsg(res.message || t('TENANTS_MSG_CREATE_SUCCESS'));
      }

      await loadTenants();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const errObj = err as { detail?: string; message?: string } | undefined;
      setActionError(errObj?.detail || errObj?.message || t('TENANTS_SAVE_ERROR'));
    } finally {
      setIsSaving(false);
    }
  };

  // Shared Form Styles standardized with UsersManagementView
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: '0.84rem',
    boxSizing: 'border-box',
    outline: 'none',
    color: '#0f172a',
    background: '#ffffff',
  };

  const getInputStyle = (hasError: boolean): React.CSSProperties => ({
    ...inputStyle,
    borderColor: hasError ? '#ef4444' : '#cbd5e1',
    boxShadow: hasError ? '0 0 0 1px #ef4444' : undefined,
  });

  const renderFieldError = (msg?: string) => {
    if (!msg) return null;
    return (
      <span style={{ display: 'block', fontSize: '0.72rem', color: '#ef4444', marginTop: 4, fontWeight: 500 }}>
        {msg}
      </span>
    );
  };

  if (loadingPlatform) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 36, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>⏳</div>
        <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{t('GLOBAL_LABEL_LOADING')}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Feedback Messages */}
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

      {/* Main Container */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
        
        {/* Decluttered Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                🏢 {t('TENANTS_TITLE')}
              </h2>
              <span
                style={{
                  background: isMultiTenant ? '#f0fdf4' : '#f0f9ff',
                  color: isMultiTenant ? '#166534' : '#0369a1',
                  border: isMultiTenant ? '1px solid #bbf7d0' : '1px solid #bae6fd',
                  padding: '3px 10px',
                  borderRadius: 16,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {isMultiTenant ? t('TENANTS_MULTI_MODE_BADGE') : t('TENANTS_MONO_MODE_BADGE')}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', maxWidth: 780 }}>
              {isMultiTenant ? t('TENANTS_SUBTITLE') : t('TENANTS_MONO_MODE_DESC')}
            </p>
          </div>

          {isMultiTenant && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)',
                transition: 'background 0.15s ease',
              }}
            >
              {t('TENANTS_BTN_NEW')}
            </button>
          )}
        </div>

        {/* ── CASO 1: MODO MONO-TENANT (CARD DECLUTTERED) ── */}
        {!isMultiTenant ? (
          <div>
            {loadingTenants ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 18, height: 18, border: '2px solid #0284c7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span>{t('GLOBAL_LABEL_LOADING')}</span>
                </div>
              </div>
            ) : primaryTenant ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 22,
                  marginBottom: 18,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                      🏥
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                        {primaryTenant.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {t('TENANTS_MONO_CURRENT_TENANT')}
                      </div>
                    </div>
                    <span
                      style={{
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        marginLeft: 6,
                      }}
                    >
                      {primaryTenant.status === TenantStatus.ACTIVE ? t('GLOBAL_STATUS_ACTIVE') : primaryTenant.status}
                    </span>
                    {primaryTenant.isDefault && (
                      <span
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {t('TENANTS_BADGE_DEFAULT')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(primaryTenant)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0284c7',
                      borderRadius: 6,
                      padding: '7px 14px',
                      fontSize: '0.80rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <span>✏️</span>
                    <span>{t('GLOBAL_BTN_EDIT')}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, fontSize: '0.82rem' }}>
                  <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.76rem', marginBottom: 3 }}>
                      {t('TENANTS_FIELD_SLUG_LABEL')}
                    </div>
                    <div style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 600 }}>
                      {primaryTenant.slug}
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.76rem', marginBottom: 3 }}>
                      {t('TENANTS_COL_CNPJ')}
                    </div>
                    <div style={{ fontFamily: 'monospace', color: '#1e293b', fontWeight: 600 }}>
                      {primaryTenant.cnpj ? Cnpj.format(primaryTenant.cnpj) : '-'}
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.76rem', marginBottom: 3 }}>
                      {t('TENANTS_COL_CONTACT')}
                    </div>
                    <div style={{ color: '#1e293b', fontWeight: 600 }}>
                      {primaryTenant.contactName || '-'}
                      {primaryTenant.contactTitle && (
                        <span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.76rem', marginLeft: 6 }}>
                          ({primaryTenant.contactTitle})
                        </span>
                      )}
                    </div>
                    {(primaryTenant.contactEmail || primaryTenant.contactPhone) && (
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 3 }}>
                        {primaryTenant.contactEmail && <div>✉️ {primaryTenant.contactEmail}</div>}
                        {primaryTenant.contactPhone && <div>📞 {Phone.format(primaryTenant.contactPhone)}</div>}
                      </div>
                    )}
                  </div>

                  <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.76rem', marginBottom: 3 }}>
                      {t('TENANTS_COL_LOCATION')}
                    </div>
                    <div style={{ color: '#1e293b' }}>
                      {primaryTenant.city ? `${primaryTenant.city} - ${primaryTenant.state ? Uf.format(primaryTenant.state) : ''}` : (primaryTenant.state ? Uf.format(primaryTenant.state) : '-')}
                      {primaryTenant.postalCode && (
                        <span style={{ color: '#64748b', fontSize: '0.76rem', marginLeft: 4 }}>
                          • CEP {Cep.format(primaryTenant.postalCode)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.76rem', marginBottom: 3 }}>
                      {t('TENANTS_FIELD_STREET_LABEL')}
                    </div>
                    <div style={{ color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {primaryTenant.street ? `${primaryTenant.street}, ${primaryTenant.number || 'S/N'}` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 36,
                  textAlign: 'center',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 10,
                  marginBottom: 18,
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🏥</div>
                <div style={{ color: '#475569', fontWeight: 600, marginBottom: 4 }}>
                  {t('TENANTS_EMPTY_LIST')}
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  style={{
                    marginTop: 12,
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('TENANTS_BTN_NEW')}
                </button>
              </div>
            )}

            {/* Discreet Multi-tenant Hint Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0369a1',
                fontSize: '0.80rem',
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
              <div>
                {t('TENANTS_MONO_ENABLE_HINT')}{' '}
                {onNavigateTab ? (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('menu_platform_settings')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#0284c7',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '0.80rem',
                    }}
                  >
                    {t('TENANTS_GO_TO_PLATFORM_SETTINGS')}
                  </button>
                ) : (
                  <strong>{t('TENANTS_GO_TO_PLATFORM_SETTINGS')}</strong>
                )}
                .
              </div>
            </div>
          </div>
        ) : (
          /* ── CASO 2: MODO MULTI-TENANT (LISTAGEM DECLUTTERED) ── */
          <div>
            {/* Search & Meta Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.90rem' }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder={t('TENANTS_SEARCH_PLACEHOLDER')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 34,
                    paddingRight: searchTerm ? 32 : 12,
                    fontSize: '0.82rem',
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      padding: 2,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                {t('TENANTS_TOTAL_COUNT', { count: filteredTenants.length })}
              </div>
            </div>

            {/* Modern Clean Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>{t('TENANTS_COL_TENANT')}</th>
                    <th style={{ padding: '12px 16px' }}>{t('TENANTS_COL_CNPJ')}</th>
                    <th style={{ padding: '12px 16px' }}>{t('TENANTS_COL_CONTACT')}</th>
                    <th style={{ padding: '12px 16px' }}>{t('TENANTS_COL_LOCATION')}</th>
                    <th style={{ padding: '12px 16px' }}>{t('GLOBAL_LABEL_STATUS')}</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('GLOBAL_LABEL_ACTIONS')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTenants ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 18, height: 18, border: '2px solid #0284c7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          <span>{t('GLOBAL_LABEL_LOADING')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>🔍</div>
                        <div>{searchTerm ? t('TENANTS_EMPTY_SEARCH') : t('TENANTS_EMPTY_LIST')}</div>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr
                        key={tenant.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Contratante Column */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                              {tenant.name}
                            </span>
                            {tenant.isDefault && (
                              <span
                                style={{
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                }}
                              >
                                {t('TENANTS_BADGE_DEFAULT')}
                              </span>
                            )}
                          </div>
                          <div style={{ fontFamily: 'monospace', color: '#0284c7', fontSize: '0.75rem', marginTop: 2 }}>
                            {tenant.slug}
                          </div>
                        </td>

                        {/* CNPJ Column */}
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#334155' }}>
                          {tenant.cnpj ? Cnpj.format(tenant.cnpj) : <span style={{ color: '#94a3b8' }}>-</span>}
                        </td>

                        {/* Contact Person / Responsible Column */}
                        <td style={{ padding: '12px 16px' }}>
                          {tenant.contactName ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                {tenant.contactName}
                              </div>
                              {tenant.contactTitle && (
                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                  {tenant.contactTitle}
                                </div>
                              )}
                              {(tenant.contactEmail || tenant.contactPhone) && (
                                <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: 2 }}>
                                  {tenant.contactEmail && <span>{tenant.contactEmail}</span>}
                                  {tenant.contactEmail && tenant.contactPhone && <span> • </span>}
                                  {tenant.contactPhone && <span>{Phone.format(tenant.contactPhone)}</span>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>

                        {/* Headquarters / City Column */}
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {tenant.city || tenant.state || tenant.country ? (
                            <div>
                              <span style={{ fontWeight: 500, color: '#1e293b' }}>
                                {[tenant.city, tenant.state ? Uf.format(tenant.state) : null].filter(Boolean).join(' - ') || '-'}
                                {tenant.country && tenant.country !== 'BRA' && (
                                  <span style={{ color: '#64748b', fontSize: '0.74rem', marginLeft: 4 }}>
                                    ({tenant.country})
                                  </span>
                                )}
                              </span>
                              {tenant.postalCode && (
                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                  {tenant.country === 'BRA' || !tenant.country
                                    ? `CEP: ${Cep.format(tenant.postalCode)}`
                                    : `ZIP: ${tenant.postalCode}`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>-</span>
                          )}
                        </td>

                        {/* Status Column */}
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              background: tenant.status === TenantStatus.ACTIVE ? '#ecfdf5' : '#fff1f2',
                              color: tenant.status === TenantStatus.ACTIVE ? '#059669' : '#e11d48',
                              border: `1px solid ${tenant.status === TenantStatus.ACTIVE ? '#a7f3d0' : '#fecdd3'}`,
                              padding: '3px 10px',
                              borderRadius: 14,
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            {tenant.status === TenantStatus.ACTIVE ? t('GLOBAL_STATUS_ACTIVE') : tenant.status}
                          </span>
                        </td>

                        {/* Actions Column */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(tenant)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#0284c7',
                              borderRadius: 6,
                              padding: '5px 12px',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                          >
                            <span>✏️</span>
                            <span>{t('GLOBAL_BTN_EDIT')}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL STANDARDIZED WITH USERS & GROUPS ── */}
      {isModalOpen && (
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
              maxWidth: 720,
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
                🏢 {isEditing ? t('TENANTS_MODAL_TITLE_EDIT') : t('TENANTS_MODAL_TITLE_CREATE')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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

            {/* Modal Form */}
            <form onSubmit={handleSaveTenant} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* Section 1: Institutional Identification */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('TENANTS_SECTION_INSTITUTIONAL')}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  {/* Nome da Contratante */}
                  <div style={{ gridColumn: 'span 7' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_NAME_LABEL')}
                      required
                    />
                    <input
                      type="text"
                      value={formData.name || ''}
                      onBlur={() => handleBlur('name')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, name: val }));
                        if (touched.name || errors.name) {
                          const err = validateTenantField('name', val);
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (err) next.name = err;
                            else delete next.name;
                            return next;
                          });
                        }
                      }}
                      style={getInputStyle(!!errors.name)}
                    />
                    {renderFieldError(errors.name)}
                  </div>

                  {/* Instance Slug (hover tooltip explaining routing/tenancy identifier) */}
                  <div style={{ gridColumn: 'span 5' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_SLUG_LABEL')}
                      tooltip={t('TENANTS_FIELD_SLUG_TOOLTIP')}
                      required
                    />
                    <input
                      type="text"
                      value={formData.slug || ''}
                      onBlur={() => handleBlur('slug')}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/\s+/g, '_');
                        setFormData((prev) => ({ ...prev, slug: val }));
                        if (touched.slug || errors.slug) {
                          const err = validateTenantField('slug', val);
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (err) next.slug = err;
                            else delete next.slug;
                            return next;
                          });
                        }
                      }}
                      style={{ ...getInputStyle(!!errors.slug), fontFamily: 'monospace' }}
                    />
                    {renderFieldError(errors.slug)}
                  </div>

                  {/* Status Operacional */}
                  <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_STATUS_LABEL')}
                    />
                    <div>
                      <ToggleSwitch
                        checked={formData.status === TenantStatus.ACTIVE}
                        onChange={(active) => setFormData((prev) => ({ ...prev, status: active ? TenantStatus.ACTIVE : TenantStatus.SUSPENDED }))}
                        activeText={t('GLOBAL_STATUS_ACTIVE')}
                        inactiveText={t('GLOBAL_STATUS_INACTIVE')}
                      />
                    </div>
                  </div>

                  {/* Default Tenant Flag */}
                  <div style={{ gridColumn: 'span 6', display: 'flex', alignItems: 'center', paddingTop: 18 }}>
                    <label
                      title={t('TENANTS_FIELD_IS_DEFAULT_TOOLTIP')}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(formData.isDefault)}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: '#0284c7' }}
                      />
                      <span style={{ fontWeight: 500 }}>{t('TENANTS_FIELD_IS_DEFAULT_LABEL')}</span>
                      <span
                        title={t('TENANTS_FIELD_IS_DEFAULT_TOOLTIP')}
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

              {/* Divisor */}
              <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

              {/* Section 2: Institutional Contact / Manager */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('TENANTS_SECTION_CONTACT')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  {/* Manager Full Name */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_CONTACT_NAME_LABEL')}
                    />
                    <input
                      type="text"
                      value={formData.contactName || ''}
                      onBlur={() => handleBlur('contactName')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, contactName: val }));
                        if (touched.contactName || errors.contactName) {
                          const err = validateTenantField('contactName', val);
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (err) next.contactName = err;
                            else delete next.contactName;
                            return next;
                          });
                        }
                      }}
                      style={getInputStyle(!!errors.contactName)}
                    />
                    {renderFieldError(errors.contactName)}
                  </div>

                  {/* Job Title / Role */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_CONTACT_TITLE_LABEL')}
                    />
                    <input
                      type="text"
                      value={formData.contactTitle || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contactTitle: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  {/* E-mail Institucional */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_CONTACT_EMAIL_LABEL')}
                    />
                    <input
                      type="email"
                      value={formData.contactEmail || ''}
                      onBlur={() => handleBlur('contactEmail')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, contactEmail: val }));
                        if (touched.contactEmail || errors.contactEmail) {
                          const err = validateTenantField('contactEmail', val);
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (err) next.contactEmail = err;
                            else delete next.contactEmail;
                            return next;
                          });
                        }
                      }}
                      style={getInputStyle(!!errors.contactEmail)}
                    />
                    {renderFieldError(errors.contactEmail)}
                  </div>

                  {/* Contact Phone */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_CONTACT_PHONE_LABEL')}
                    />
                    <input
                      type="text"
                      maxLength={15}
                      value={formData.contactPhone || ''}
                      onBlur={() => handleBlur('contactPhone')}
                      onChange={(e) => {
                        const formatted = Phone.format(e.target.value);
                        setFormData((prev) => ({ ...prev, contactPhone: formatted }));
                        if (touched.contactPhone || errors.contactPhone) {
                          const err = validateTenantField('contactPhone', formatted);
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (err) next.contactPhone = err;
                            else delete next.contactPhone;
                            return next;
                          });
                        }
                      }}
                      style={{ ...getInputStyle(!!errors.contactPhone), fontFamily: 'monospace' }}
                    />
                    {renderFieldError(errors.contactPhone)}
                  </div>
                </div>
              </div>

              {/* Divisor */}
              <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

              {/* Section 3: Tax & Registration Records */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('TENANTS_SECTION_FISCAL')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  {/* CNPJ (masked with Value Object validation) */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_CNPJ_LABEL')}
                    />
                    <input
                      type="text"
                      maxLength={18}
                      value={formData.cnpj || ''}
                      onBlur={() => handleBlur('cnpj')}
                      onChange={(e) => {
                        const formatted = Cnpj.format(e.target.value);
                        setFormData((prev) => ({ ...prev, cnpj: formatted }));
                        if (touched.cnpj || errors.cnpj) {
                          const err = validateTenantField('cnpj', formatted);
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (err) next.cnpj = err;
                            else delete next.cnpj;
                            return next;
                          });
                        }
                      }}
                      style={{ ...getInputStyle(!!errors.cnpj), fontFamily: 'monospace' }}
                    />
                    {renderFieldError(errors.cnpj)}
                  </div>

                  {/* Tax ID (com hover icon para explicar uso internacional) */}
                  <div style={{ gridColumn: 'span 6' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_TAX_ID_LABEL')}
                      tooltip={t('TENANTS_FIELD_TAX_ID_TOOLTIP')}
                    />
                    <input
                      type="text"
                      maxLength={30}
                      value={formData.taxId || ''}
                      onBlur={() => handleBlur('taxId')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, taxId: val }));
                        if (touched.taxId || errors.taxId) {
                          const err = validateTenantField('taxId', val);
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (err) next.taxId = err;
                            else delete next.taxId;
                            return next;
                          });
                        }
                      }}
                      style={getInputStyle(!!errors.taxId)}
                    />
                    {renderFieldError(errors.taxId)}
                  </div>
                </div>
              </div>

              {/* Divisor */}
              <div style={{ borderTop: '1px solid #f1f5f9', margin: '2px 0' }} />

              {/* Section 4: Corporate Address */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {t('TENANTS_SECTION_ADDRESS')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
                  {/* Postal Code / CEP (masked in Brazil, freeform international) */}
                  <div style={{ gridColumn: 'span 4' }}>
                    <FieldLabelWithTooltip
                      label={isCurrentTenantBrazil ? t('TENANTS_FIELD_POSTAL_CODE_BRAZIL_LABEL') : t('TENANTS_FIELD_POSTAL_CODE_INTL_LABEL')}
                    />
                    <input
                      type="text"
                      maxLength={isCurrentTenantBrazil ? 9 : 20}
                      value={formData.postalCode || ''}
                      onBlur={() => handleBlur('postalCode')}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const formatted = isCurrentTenantBrazil ? Cep.format(raw) : raw;
                        setFormData((prev) => ({ ...prev, postalCode: formatted }));
                        if (touched.postalCode || errors.postalCode) {
                          const err = validateTenantField('postalCode', formatted);
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (err) next.postalCode = err;
                            else delete next.postalCode;
                            return next;
                          });
                        }
                      }}
                      style={{ ...getInputStyle(!!errors.postalCode), fontFamily: isCurrentTenantBrazil ? 'monospace' : 'inherit' }}
                    />
                    {renderFieldError(errors.postalCode)}
                  </div>

                  {/* Logradouro / Rua */}
                  <div style={{ gridColumn: 'span 8' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_STREET_LABEL')}
                    />
                    <input
                      type="text"
                      value={formData.street || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, street: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  {/* Street Number */}
                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_NUMBER_LABEL')}
                    />
                    <input
                      type="text"
                      value={formData.number || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, number: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  {/* Complemento */}
                  <div style={{ gridColumn: 'span 4' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_COMPLEMENT_LABEL')}
                    />
                    <input
                      type="text"
                      value={formData.complement || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, complement: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  {/* Bairro */}
                  <div style={{ gridColumn: 'span 5' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_NEIGHBORHOOD_LABEL')}
                    />
                    <input
                      type="text"
                      value={formData.neighborhood || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, neighborhood: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  {/* Cidade */}
                  <div style={{ gridColumn: 'span 5' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_CITY_LABEL')}
                    />
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  {/* Estado: Select UF para Brasil / Input texto descritivo para Internacional (sem "UF" no label) */}
                  <div style={{ gridColumn: 'span 4' }}>
                    {isCurrentTenantBrazil ? (
                      <>
                        <FieldLabelWithTooltip
                          label={t('TENANTS_FIELD_STATE_BRAZIL_LABEL')}
                        />
                        <select
                          value={formData.state || ''}
                          onBlur={() => handleBlur('state')}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({ ...prev, state: val }));
                            if (touched.state || errors.state) {
                              const err = validateTenantField('state', val);
                              setErrors((prev) => {
                                const next = { ...prev };
                                if (err) next.state = err;
                                else delete next.state;
                                return next;
                              });
                            }
                          }}
                          style={getInputStyle(!!errors.state)}
                        >
                          <option value="">Selecione a UF</option>
                          {BRAZILIAN_UFS.map((uf) => (
                            <option key={uf} value={uf}>
                              {uf} - {BRAZILIAN_UF_NAMES[uf]}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <FieldLabelWithTooltip
                          label={t('TENANTS_FIELD_STATE_INTL_LABEL')}
                        />
                        <input
                          type="text"
                          maxLength={100}
                          value={formData.state || ''}
                          onBlur={() => handleBlur('state')}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({ ...prev, state: val }));
                            if (touched.state || errors.state) {
                              const err = validateTenantField('state', val);
                              setErrors((prev) => {
                                const next = { ...prev };
                                if (err) next.state = err;
                                else delete next.state;
                                return next;
                              });
                            }
                          }}
                          style={getInputStyle(!!errors.state)}
                        />
                      </>
                    )}
                    {renderFieldError(errors.state)}
                  </div>

                  {/* Country selection standardized with Country Value Object */}
                  <div style={{ gridColumn: 'span 3' }}>
                    <FieldLabelWithTooltip
                      label={t('TENANTS_FIELD_COUNTRY_LABEL')}
                    />
                    <select
                      value={formData.country || ''}
                      onChange={(e) => {
                        const newCountry = e.target.value;
                        const wasBrazil = formData.country === 'BRA';
                        const isNowBrazil = newCountry === 'BRA';

                        setFormData((prev) => {
                          let nextState = prev.state;
                          let nextPostal = prev.postalCode;
                          if (wasBrazil && !isNowBrazil) {
                            // transitioning from Brazil: keep or allow user to type freely
                          } else if (!wasBrazil && isNowBrazil) {
                            if (nextPostal) nextPostal = Cep.format(nextPostal);
                            if (nextState && !Uf.isValid(nextState)) nextState = '';
                          }
                          return {
                            ...prev,
                            country: newCountry,
                            state: nextState,
                            postalCode: nextPostal,
                          };
                        });

                        // Clear errors for state and postalCode when country changes
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.state;
                          delete next.postalCode;
                          return next;
                        });
                      }}
                      style={inputStyle}
                    >
                      <option value="">{t('TENANTS_FIELD_COUNTRY_EMPTY')}</option>
                      {countryOptions.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.display}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 10,
                  paddingTop: 16,
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t('GLOBAL_BTN_CANCEL')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '8px 22px',
                    borderRadius: 6,
                    border: 'none',
                    background: isSaving ? '#94a3b8' : '#0284c7',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {isSaving ? t('GLOBAL_LABEL_SAVING') : t('GLOBAL_BTN_SAVE')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/index.js';
import {
  getCurrentApplicationConfig,
  updateCurrentApplicationConfig,
  type TenantApplicationConfigResponse,
} from '../../services/api.js';
import { AlertBanner, AlertBannerType } from '../../components/AlertBanner.js';

const formatPhone = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const ApplicationSettingsView: React.FC = () => {
  const { t } = useI18n();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'governance' | 'support'>('overview');
  const [feedback, setFeedback] = useState<{ type: AlertBannerType; msg: string } | null>(null);

  // Application Data & Config
  const [data, setData] = useState<TenantApplicationConfigResponse | null>(null);

  // Form State (Configuração do Sistema - Perfil ADMIN)
  const [supportContactName, setSupportContactName] = useState<string>('');
  const [supportPhone, setSupportPhone] = useState<string>('');
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [enforceTerms, setEnforceTerms] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Validation Errors
  const [errors, setErrors] = useState<{
    supportPhone?: string;
    supportEmail?: string;
  }>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getCurrentApplicationConfig();
      setData(res);

      const cfg = (res.config.configJson || {}) as Record<string, any>;

      setSupportContactName(String(cfg.supportContactName || cfg.support_contact_name || ''));
      setSupportPhone(formatPhone(String(cfg.supportPhone || cfg.support_phone || cfg.contactPhone || '')));
      setSupportEmail(String(cfg.supportEmail || cfg.support_email || cfg.contactEmail || ''));

      setEnforceTerms(Boolean(res.config.enforceDocumentAcceptanceOnLogin));
      setIsActive(Boolean(res.config.isActive));
    } catch (err: any) {
      setFeedback({
        type: AlertBannerType.ERROR,
        msg: t('APP_SETTINGS_LOAD_ERROR') + (err?.message ? ` (${err.message})` : ''),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    const rawPhone = supportPhone.replace(/\D/g, '');
    if (rawPhone && (rawPhone.length < 10 || rawPhone.length > 11)) {
      newErrors.supportPhone = t('APP_SETTINGS_ERR_PHONE');
    }

    if (supportEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supportEmail.trim())) {
        newErrors.supportEmail = t('APP_SETTINGS_ERR_EMAIL');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setFeedback({
        type: AlertBannerType.WARNING,
        msg: t('APP_SETTINGS_FORM_INVALID'),
      });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const existingConfigJson = (data?.config.configJson || {}) as Record<string, any>;

      const payload = {
        isActive,
        enforceDocumentAcceptanceOnLogin: enforceTerms,
        configJson: {
          ...existingConfigJson,
          supportContactName: supportContactName.trim(),
          supportPhone: supportPhone.trim(),
          supportEmail: supportEmail.trim(),
        },
      };

      await updateCurrentApplicationConfig(payload);
      setFeedback({
        type: AlertBannerType.SUCCESS,
        msg: t('APP_SETTINGS_SAVED_SUCCESS'),
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: AlertBannerType.ERROR,
        msg: t('APP_SETTINGS_SAVE_ERROR') + (err?.message ? ` (${err.message})` : ''),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 32, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
        <div>{t('APP_SETTINGS_LOADING')}</div>
      </div>
    );
  }

  const app = data?.application;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Compacto */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 22px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.18rem', fontWeight: 700 }}>
            ⚙️ {t('APP_SETTINGS_TITLE')}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {t('APP_SETTINGS_SUBTITLE')}
          </p>
        </div>

        {/* Navigation Tabs na sequência solicitada */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'overview' ? '#0284c7' : 'transparent',
              color: activeTab === 'overview' ? '#fff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            📋 {t('APP_SETTINGS_TAB_OVERVIEW')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('governance')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'governance' ? '#0284c7' : 'transparent',
              color: activeTab === 'governance' ? '#fff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            🛡️ {t('APP_SETTINGS_TAB_GOVERNANCE')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('support')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'support' ? '#0284c7' : 'transparent',
              color: activeTab === 'support' ? '#fff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            🎧 {t('APP_SETTINGS_TAB_SUPPORT')}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <AlertBanner
          type={feedback.type}
          message={feedback.msg}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Formulário de Configurações do Sistema */}
      <form onSubmit={handleSave}>
        {/* Aba 1: Visão Geral & Identidade */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {/* Aplicação Conectada */}
              <div style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  {t('APP_SETTINGS_CARD_APP_NAME')}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  {app?.appName || '—'}
                </div>
                {app?.appSubtitle && (
                  <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 500, marginTop: 2 }}>
                    {app.appSubtitle}
                  </div>
                )}
              </div>

              {/* Versão do Software */}
              <div style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  {t('APP_SETTINGS_CARD_VERSION')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {app?.appVersion ? (
                    <span
                      style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: '0.84rem',
                        fontWeight: 700,
                      }}
                    >
                      v{app.appVersion}
                    </span>
                  ) : (
                    '—'
                  )}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>
                  {app?.code || '—'}
                </div>
              </div>

              {/* Status Operacional */}
              <div style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  {t('APP_SETTINGS_CARD_STATUS')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? '#10b981' : '#ef4444' }} />
                  <span style={{ fontWeight: 700, color: isActive ? '#065f46' : '#991b1b', fontSize: '0.9rem' }}>
                    {isActive ? t('APP_SETTINGS_CARD_STATUS_ACTIVE') : t('APP_SETTINGS_CARD_STATUS_INACTIVE')}
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 4 }}>
                  {app?.isMultiTenant ? t('PLATFORM_SETTINGS_MODE_MULTI') : t('PLATFORM_SETTINGS_MODE_MONO')}
                </div>
              </div>

              {/* Fuso Horário & Idioma */}
              <div style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  {t('APP_SETTINGS_FIELD_TIMEZONE')}
                </div>
                <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                  {app?.defaultTimezone || '—'}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 2 }}>
                  {t('APP_SETTINGS_BASE_LOCALE')} {app?.defaultLocale || '—'}
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                ℹ️ {t('APP_SETTINGS_FIELD_DESCRIPTION')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                {app?.appDescription || '—'}
              </p>
            </div>
          </div>
        )}

        {/* Aba 2: Governança & Instância */}
        {activeTab === 'governance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', padding: '20px 22px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
                🛡️ {t('APP_SETTINGS_TAB_GOVERNANCE')}
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#64748b' }}>
                {t('APP_SETTINGS_GOVERNANCE_DESC')}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Switch de Termos de Uso / LGPD */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ maxWidth: 640 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                      {t('APP_SETTINGS_ENFORCE_TERMS')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3 }}>
                      {t('APP_SETTINGS_ENFORCE_TERMS_DESC')}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enforceTerms}
                    onChange={(e) => setEnforceTerms(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#0284c7', cursor: 'pointer' }}
                  />
                </label>

                {/* Switch de Ativação Operacional da Instância */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 8,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                      {t('APP_SETTINGS_INSTANCE_ACTIVE')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3 }}>
                      {t('APP_SETTINGS_INSTANCE_ACTIVE_DESC')}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#0284c7', cursor: 'pointer' }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Aba 3: Canais de Suporte Técnico */}
        {activeTab === 'support' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', padding: '20px 22px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🎧</span>
                    <span>{t('APP_SETTINGS_SECTION_SUPPORT')}</span>
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    {t('APP_SETTINGS_SUBTITLE')}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Nome do Responsável / Equipe */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('APP_SETTINGS_FIELD_SUPPORT_NAME')}
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Equipe de TI / Suporte Local"
                    maxLength={100}
                    value={supportContactName}
                    onChange={(e) => setSupportContactName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      outline: 'none',
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                    {t('APP_SETTINGS_SUPPORT_NAME_HINT')}
                  </span>
                </div>

                {/* Telefone do Suporte */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('APP_SETTINGS_FIELD_SUPPORT_PHONE')}
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    maxLength={15}
                    value={supportPhone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setSupportPhone(formatted);
                      if (errors.supportPhone) setErrors((prev) => ({ ...prev, supportPhone: undefined }));
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: errors.supportPhone ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '0.72rem', color: errors.supportPhone ? '#ef4444' : '#64748b', marginTop: 4 }}>
                    {errors.supportPhone || t('APP_SETTINGS_SUPPORT_PHONE_HINT')}
                  </span>
                </div>

                {/* E-mail do Suporte */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    {t('APP_SETTINGS_FIELD_SUPPORT_EMAIL')}
                  </label>
                  <input
                    type="email"
                    placeholder="suporte@clinica.com.br"
                    maxLength={80}
                    value={supportEmail}
                    onChange={(e) => {
                      setSupportEmail(e.target.value);
                      if (errors.supportEmail) setErrors((prev) => ({ ...prev, supportEmail: undefined }));
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: errors.supportEmail ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      outline: 'none',
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '0.72rem', color: errors.supportEmail ? '#ef4444' : '#64748b', marginTop: 4 }}>
                    {errors.supportEmail || t('APP_SETTINGS_SUPPORT_EMAIL_HINT')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Ação Alinhado à Direita */}
        {activeTab !== 'overview' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 22px',
                borderRadius: 6,
                background: saving ? '#94a3b8' : '#0284c7',
                color: '#fff',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)',
              }}
            >
              {saving ? `⏳ ${t('APP_SETTINGS_SAVING')}` : `💾 ${t('APP_SETTINGS_BTN_SAVE')}`}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

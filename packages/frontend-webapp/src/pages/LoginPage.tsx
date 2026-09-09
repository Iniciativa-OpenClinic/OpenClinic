import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { forgotPassword, resetPassword } from '../services/api.js';
import { EyeIcon, EyeOffIcon } from '../components/EyeIcons.js';
import { AlertBanner, AlertBannerType } from '../components/AlertBanner.js';
import { useConfig } from '../context/ConfigContext.js';
import { t } from '../i18n/index.js';
import logoImg from '../assets/logo.png';
import { LoginIdentifierType, Cpf } from '@openclinic/core/shared';

type AuthView = 'login' | 'forgot' | 'reset';

export interface TestUser {
  username: string;
  cpf: string;
  role: string;
}

export const TEST_USERS: TestUser[] = [
  { username: 'ana.souza', cpf: '444.555.666-19', role: 'Atendente' },
  { username: 'marta.lima', cpf: '333.444.555-08', role: 'Enfermeira' },
  { username: 'mateus.oliveira', cpf: '222.333.444-05', role: 'Médico' },
  { username: 'marcos.ferreira', cpf: '111.222.333-96', role: 'Diretor' },
  { username: 'lucas.santos', cpf: '987.654.321-00', role: 'Administrador' },
  { username: 'joao.silva', cpf: '123.456.789-09', role: 'Superadministrador' },
];

export default function LoginPage() {
  const { appLogoUrl, appName, appSubtitle, appVersion, primaryLoginIdentifier, refreshConfig } = useConfig();
  const [view, setView] = useState<AuthView>('login');

  // Refresh public configuration whenever login page mounts (e.g. after logout or setting change)
  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const identifierConfig = {
    [LoginIdentifierType.CPF]: {
      label: t('FIELD_LOGIN_IDENTIFIER_CPF'),
      placeholder: '000.000.000-00',
      type: 'text',
    },
    [LoginIdentifierType.USERNAME]: {
      label: t('FIELD_LOGIN_IDENTIFIER_USERNAME'),
      placeholder: 'usuario.exemplo',
      type: 'text',
    },
    [LoginIdentifierType.EMAIL]: {
      label: t('FIELD_LOGIN_IDENTIFIER_EMAIL'),
      placeholder: 'usuario@clinica.com.br',
      type: 'email',
    },
  }[primaryLoginIdentifier] || {
    label: t('FIELD_LOGIN_IDENTIFIER_CPF'),
    placeholder: '000.000.000-00',
    type: 'text',
  };

  // Login State
  const [identifier, setIdentifier] = useState('');
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, error: authError, clearError, isLoading } = useAuth();
  const identifierInputRef = useRef<HTMLInputElement>(null);

  // Automatically focus on username / identifier whenever the login form is shown
  useEffect(() => {
    if (view === 'login') {
      const timer = setTimeout(() => {
        identifierInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Forgot Password State
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{ message: string; data?: { simulated_email?: string; reset_token?: string } } | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Reset Password State
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (primaryLoginIdentifier === LoginIdentifierType.CPF) {
      const formatted = Cpf.format(val);
      setIdentifier(formatted);
      if (Cpf.clean(val).length === 11) {
        if (!Cpf.isValid(val)) {
          setIdentifierError(t('ERROR_INVALID_CPF'));
        } else {
          setIdentifierError(null);
        }
      } else {
        setIdentifierError(null);
      }
    } else {
      setIdentifier(val);
      setIdentifierError(null);
    }
  };

  const handleIdentifierBlur = () => {
    if (!identifier.trim()) return;
    const cleanDigits = Cpf.clean(identifier);
    if (
      primaryLoginIdentifier === LoginIdentifierType.CPF ||
      (cleanDigits.length === 11 && !identifier.includes('@') && !/[a-zA-Z]/.test(identifier))
    ) {
      if (!Cpf.isValid(identifier)) {
        setIdentifierError(t('ERROR_INVALID_CPF'));
      } else {
        setIdentifierError(null);
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentifierError(null);

    const cleanDigits = Cpf.clean(identifier);
    if (
      primaryLoginIdentifier === LoginIdentifierType.CPF ||
      (cleanDigits.length === 11 && !identifier.includes('@') && !/[a-zA-Z]/.test(identifier))
    ) {
      if (!Cpf.isValid(identifier)) {
        setIdentifierError(t('ERROR_INVALID_CPF'));
        identifierInputRef.current?.focus();
        return;
      }
    }

    const success = await login(identifier, password);
    if (!success) {
      setTimeout(() => {
        identifierInputRef.current?.focus();
        identifierInputRef.current?.select();
      }, 50);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await forgotPassword(forgotIdentifier);
      setForgotResult(res);
      if (res.data?.reset_token) {
        setResetToken(res.data.reset_token);
      }
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : t('ERROR_FORGOT_PASSWORD'));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResetError(t('ERROR_PASSWORD_MISMATCH'));
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await resetPassword(resetToken, newPassword);
      setResetSuccess(res.message);
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setForgotResult(null);
      setView('login');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : t('ERROR_RESET_PASSWORD'));
    } finally {
      setResetLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 500,
    width: '100%',
    margin: '36px auto',
    padding: '38px 36px',
    background: '#ffffff',
    borderRadius: 18,
    boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.07), 0 8px 12px -6px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.94rem',
    boxSizing: 'border-box',
    outline: 'none',
    color: '#0f172a',
  };

  const btnStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: 8,
    background: '#0ea5e9',
    color: '#ffffff',
    border: 'none',
    fontSize: '0.96rem',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div style={containerStyle}>
      
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img
          src={appLogoUrl || logoImg}
          alt={appName || "OpenClinic Logo"}
          style={{ height: 64, objectFit: 'contain', marginBottom: 10 }}
          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
        />
        <h1 style={{ margin: 0, fontSize: '1.85rem', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.03em' }}>
          {appName || t('LOGIN_TITLE')}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.45, fontWeight: 500 }}>
          {view === 'login' && (appSubtitle || t('LOGIN_SUBTITLE'))}
          {view === 'forgot' && t('FORGOT_SUBTITLE')}
          {view === 'reset' && t('RESET_SUBTITLE')}
        </p>
      </div>

      {/* ── 1. TELA DE LOGIN ── */}
      {view === 'login' && (
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {resetSuccess && (
            <AlertBanner
              type={AlertBannerType.SUCCESS}
              message={resetSuccess}
              onClose={() => setResetSuccess(null)}
            />
          )}

          {authError && (
            <AlertBanner
              type={AlertBannerType.ERROR}
              message={authError}
              onClose={clearError}
            />
          )}

          <div>
            <label htmlFor="username" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              {identifierConfig.label}
            </label>
            <input
              id="username"
              name="username"
              ref={identifierInputRef}
              type={identifierConfig.type}
              placeholder={identifierConfig.placeholder}
              value={identifier}
              onChange={handleIdentifierChange}
              onBlur={handleIdentifierBlur}
              style={{
                ...inputStyle,
                border: identifierError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
              }}
              autoComplete="username"
              autoFocus
              required
            />
            {identifierError && (
              <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 4, display: 'block', fontWeight: 500 }}>
                ⚠️ {identifierError}
              </span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              {t('FIELD_LOGIN_PASSWORD')}
            </label>
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 44 }}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.75,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.75'; }}
                title={showPassword ? t('TOOLTIP_HIDE_PASS') : t('TOOLTIP_SHOW_PASS')}
              >
                {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>

            {/* Esqueci a senha */}
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => { setView('forgot'); setForgotError(null); setForgotResult(null); clearError(); }}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                {t('FORGOT_PASS_LINK')}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} style={{ ...btnStyle, opacity: isLoading ? 0.7 : 1, marginTop: 4 }}>
            {isLoading ? t('BTN_PROCESSING') : t('LOGIN_BTN')}
          </button>

          <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', color: '#64748b', border: '1px dashed #cbd5e1', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: '#334155' }}>
                👥 Usuários de Teste (senha: <code>temp1234</code>)
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: '#0369a1',
                background: '#e0f2fe',
                padding: '2px 6px',
                borderRadius: 4,
              }}>
                Login: {primaryLoginIdentifier}
              </span>
            </div>
            {TEST_USERS.map((u) => {
              const activeCredential = primaryLoginIdentifier === LoginIdentifierType.CPF ? u.cpf : u.username;
              return (
                <div
                  key={u.username}
                  onClick={() => {
                    setIdentifier(activeCredential);
                    setPassword('temp1234');
                    setIdentifierError(null);
                    clearError();
                  }}
                  style={{
                    padding: '3px 6px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  title={`Preencher credencial de teste: ${activeCredential}`}
                >
                  <span>
                    • <code>{u.username}</code> — CPF: <code>{u.cpf}</code> — {u.role}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 600 }}>Usar ↵</span>
                </div>
              );
            })}
          </div>
        </form>
      )}

      {/* ── 2. TELA ESQUECI A SENHA ── */}
      {view === 'forgot' && (
        <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {forgotError && (
            <AlertBanner
              type={AlertBannerType.ERROR}
              message={forgotError}
              onClose={() => setForgotError(null)}
            />
          )}

          {!forgotResult && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  {t('FIELD_LOGIN_IDENTIFIER')}
                </label>
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <button type="submit" disabled={forgotLoading} style={{ ...btnStyle, opacity: forgotLoading ? 0.7 : 1 }}>
                {forgotLoading ? t('BTN_PROCESSING') : t('BTN_SEND_RECOVERY')}
              </button>
            </>
          )}

          {forgotResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 14, background: '#f0fdf4', color: '#166534', borderRadius: 8, fontSize: '0.84rem', border: '1px solid #bbf7d0', lineHeight: 1.5 }}>
                ✅ <strong>Simulação de E-mail Enviado:</strong><br />
                {forgotResult.message}<br />
                {forgotResult.data?.simulated_email && (
                  <span style={{ fontSize: '0.78rem', color: '#15803d' }}>
                    Destinatário: <strong>{forgotResult.data.simulated_email}</strong>
                  </span>
                )}
              </div>

              {forgotResult.data?.reset_token && (
                <button
                  type="button"
                  onClick={() => setView('reset')}
                  style={{ ...btnStyle, background: '#16a34a' }}
                >
                  {t('BTN_CONTINUE_RESET')} ➔
                </button>
              )}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setView('login'); clearError(); }}
              style={{ padding: '8px', background: 'transparent', color: '#64748b', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ← {t('BTN_BACK_TO_LOGIN')}
            </button>
          </div>
        </form>
      )}

      {/* ── 3. TELA REDEFINIR SENHA ── */}
      {view === 'reset' && (
        <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {resetError && (
            <AlertBanner
              type={AlertBannerType.ERROR}
              message={resetError}
              onClose={() => setResetError(null)}
            />
          )}

          {resetSuccess && (
            <AlertBanner
              type={AlertBannerType.SUCCESS}
              message={resetSuccess}
              onClose={() => setResetSuccess(null)}
            />
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              {t('FIELD_RECOVERY_TOKEN')}
            </label>
            <input
              type="text"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.82rem' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              {t('FIELD_NEW_PASS_MIN')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showResetPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 44 }}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowResetPass(!showResetPass)}
                style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                title={showResetPass ? t('TOOLTIP_HIDE_PASS') : t('TOOLTIP_SHOW_PASS')}
              >
                {showResetPass ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              {t('FIELD_CONFIRM_PASSWORD')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <button type="submit" disabled={resetLoading} style={{ ...btnStyle, opacity: resetLoading ? 0.7 : 1 }}>
            {resetLoading ? t('BTN_PROCESSING') : t('BTN_SAVE_NEW_PASSWORD')}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setView('login'); clearError(); }}
              style={{ padding: '8px', background: 'transparent', color: '#64748b', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ← {t('BTN_CANCEL_AND_BACK')}
            </button>
          </div>
        </form>
      )}

      {/* Red Notice: Auth Testing Scope Disclaimer */}
      <div
        role="note"
        style={{
          marginTop: 20,
          padding: '10px 14px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: 8,
          color: '#b91c1c',
          fontSize: '0.78rem',
          lineHeight: 1.45,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          boxShadow: '0 1px 2px rgba(239, 68, 68, 0.05)',
        }}
      >
        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <span style={{ fontWeight: 500 }}>{t('LOGIN_AUTH_TEST_NOTICE')}</span>
      </div>

      {/* Card Footer: Version */}
      {appVersion && (
        <div
          style={{
            marginTop: 24,
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              color: '#94a3b8',
              fontWeight: 500,
              letterSpacing: '0.02em',
              userSelect: 'none',
            }}
          >
            v{appVersion.replace(/^v/, '')}
          </span>
        </div>
      )}
    </div>
  );
}

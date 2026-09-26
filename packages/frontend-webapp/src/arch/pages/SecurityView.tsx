import React, { useState } from 'react';
import { changePassword } from '../../services/api.js';
import { useI18n } from '../../i18n/index.js';
import { EyeIcon, EyeOffIcon } from '../../components/EyeIcons.js';
import { AlertBanner, AlertBannerType } from '../../components/AlertBanner.js';

export const SecurityView: React.FC = () => {
  const { t } = useI18n();
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showMyPass, setShowMyPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const handleChangeMyPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setPassError(t('ERROR_PASSWORD_MISMATCH'));
      return;
    }
    setPassLoading(true);
    setPassError(null);
    setPassSuccess(null);
    try {
      const res = await changePassword(currPass, newPass);
      setPassSuccess(res.message || t('SUCCESS_PASSWORD_CHANGED'));
      setCurrPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      setPassError(err instanceof Error ? err.message : t('ERROR_CHANGE_PASSWORD'));
    } finally {
      setPassLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const btnStyle: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: 8,
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, maxWidth: 480 }}>
      <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>{t('MY_PASSWORD_TITLE')}</h3>
      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 18px' }}>
        {t('MY_PASSWORD_SUBTITLE')}
      </p>

      {passError && (
        <AlertBanner
          type={AlertBannerType.ERROR}
          message={passError}
          onClose={() => setPassError(null)}
        />
      )}

      {passSuccess && (
        <AlertBanner
          type={AlertBannerType.SUCCESS}
          message={passSuccess}
          onClose={() => setPassSuccess(null)}
        />
      )}

      <form onSubmit={handleChangeMyPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_CURRENT_PASSWORD')}</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showMyPass ? 'text' : 'password'}
              value={currPass}
              onChange={(e) => setCurrPass(e.target.value)}
              style={{ ...inputStyle, paddingRight: 40 }}
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowMyPass(!showMyPass)}
              style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              {showMyPass ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
            </button>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_NEW_PASSWORD')}</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showMyPass ? 'text' : 'password'}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              style={{ ...inputStyle, paddingRight: 40 }}
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowMyPass(!showMyPass)}
              style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              {showMyPass ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
            </button>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_CONFIRM_PASSWORD')}</label>
          <input
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        <button type="submit" disabled={passLoading} style={{ ...btnStyle, opacity: passLoading ? 0.7 : 1, marginTop: 6 }}>
          {passLoading ? t('BTN_PROCESSING') : t('BTN_UPDATE_MY_PASSWORD')}
        </button>
      </form>
    </div>
  );
};

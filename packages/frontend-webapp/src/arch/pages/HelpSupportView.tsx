import React, { useState } from 'react';
import { useI18n } from '../../i18n/index.js';

export const HelpSupportView: React.FC = () => {
  const { t } = useI18n();
  const [supportSubject, setSupportSubject] = useState('');
  const [supportCategory, setSupportCategory] = useState('HELP_CAT_QUESTION');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportTickets, setSupportTickets] = useState<Array<{ id: string; subject: string; category: string; date: string; status: string }>>([
    { id: 'TKT-1082', subject: t('HELP_SAMPLE_TICKET_SUBJECT'), category: t('HELP_CAT_QUESTION'), date: new Date().toLocaleDateString(), status: t('HELP_STATUS_ANSWERED') },
  ]);
  const [supportSuccess, setSupportSuccess] = useState<string | null>(null);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTkt = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: supportSubject,
      category: t(supportCategory as any),
      date: new Date().toLocaleDateString(),
      status: t('HELP_STATUS_OPEN'),
    };
    setSupportTickets([newTkt, ...supportTickets]);
    setSupportSuccess(t('HELP_TICKET_SENT_SUCCESS', { id: newTkt.id }));
    setSupportSubject('');
    setSupportMessage('');
    setTimeout(() => setSupportSuccess(null), 4000);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
        <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>{t('HELP_TITLE')}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
          {t('HELP_SUBTITLE')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>🔐 {t('HELP_CARD_RBAC_TITLE')}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{t('HELP_CARD_RBAC_DESC')}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>🛡️ {t('HELP_CARD_CRYPTO_TITLE')}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{t('HELP_CARD_CRYPTO_DESC')}</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, maxWidth: 640 }}>
        <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>{t('HELP_FORM_TITLE')}</h3>
        {supportSuccess && (
          <div style={{ padding: 10, background: '#f0fdf4', color: '#166534', borderRadius: 8, fontSize: '0.82rem', marginBottom: 14 }}>
            {supportSuccess}
          </div>
        )}
        <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_HELP_CATEGORY')}</label>
            <select value={supportCategory} onChange={(e) => setSupportCategory(e.target.value)} style={inputStyle}>
              <option value="HELP_CAT_QUESTION">{t('HELP_CAT_QUESTION')}</option>
              <option value="HELP_CAT_ACCESS">{t('HELP_CAT_ACCESS')}</option>
              <option value="HELP_CAT_SUGGESTION">{t('HELP_CAT_SUGGESTION')}</option>
              <option value="HELP_CAT_BUG">{t('HELP_CAT_BUG')}</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_HELP_SUBJECT')}</label>
            <input type="text" value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>{t('FIELD_HELP_MESSAGE')}</label>
            <textarea rows={4} value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} required />
          </div>
          <button type="submit" style={btnStyle}>📨 {t('BTN_SEND_TICKET')}</button>
        </form>
      </div>
    </div>
  );
};

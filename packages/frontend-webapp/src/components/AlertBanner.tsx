import React, { useEffect } from 'react';
import { AlertBannerType } from '@openclinic/core/enums';
import { APP_CONFIG } from '../config/app.config.js';

export { AlertBannerType };

export interface AlertBannerProps {
  type: AlertBannerType | 'success' | 'error' | 'info' | 'warning';
  message: string | null;
  onClose: () => void;
  autoDismissSeconds?: number;
  icon?: React.ReactNode;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  message,
  onClose,
  autoDismissSeconds = APP_CONFIG.NOTIFICATION_AUTO_DISMISS_SECONDS,
  icon,
}) => {
  useEffect(() => {
    if (!message || autoDismissSeconds <= 0) return;

    const timer = setTimeout(() => {
      onClose();
    }, autoDismissSeconds * 1000);

    return () => clearTimeout(timer);
  }, [message, autoDismissSeconds, onClose]);

  if (!message) return null;

  const stylesByType: Record<
    AlertBannerType,
    { bg: string; border: string; text: string; defaultIcon: string }
  > = {
    [AlertBannerType.SUCCESS]: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      text: '#166534',
      defaultIcon: '🎉',
    },
    [AlertBannerType.ERROR]: {
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#dc2626',
      defaultIcon: '⚠️',
    },
    [AlertBannerType.WARNING]: {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#b45309',
      defaultIcon: '⚠️',
    },
    [AlertBannerType.INFO]: {
      bg: '#f0f9ff',
      border: '#bae6fd',
      text: '#0369a1',
      defaultIcon: 'ℹ️',
    },
  };

  const currentStyle = stylesByType[type] || stylesByType[AlertBannerType.INFO];

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 16px',
        background: currentStyle.bg,
        border: `1px solid ${currentStyle.border}`,
        borderRadius: 8,
        color: currentStyle.text,
        fontSize: '0.85rem',
        fontWeight: 500,
        marginBottom: 18,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon ?? currentStyle.defaultIcon}</span>
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        title="Fechar mensagem"
        style={{
          background: 'none',
          border: 'none',
          color: currentStyle.text,
          opacity: 0.7,
          fontSize: '1rem',
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
          borderRadius: 4,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
      >
        ✖
      </button>
    </div>
  );
};

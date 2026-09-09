import React from 'react';
import { t } from '../../i18n/index.js';

export const FieldLabelWithTooltip: React.FC<{
  label: string;
  tooltip?: string;
  required?: boolean;
}> = ({ label, tooltip, required }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
      {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
    </label>
    {tooltip && (
      <span
        title={tooltip}
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
    )}
  </div>
);

export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  activeText?: string;
  inactiveText?: string;
  title?: string;
}> = ({
  checked,
  onChange,
  disabled = false,
  activeText = t('GLOBAL_STATUS_ACTIVE'),
  inactiveText = t('GLOBAL_STATUS_INACTIVE'),
  title,
}) => {
  const currentStatus = checked ? activeText : inactiveText;
  const tooltipText = title || currentStatus;

  return (
    <div
      title={tooltipText}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: checked ? '#f0fdf4' : '#fff7ed',
        border: checked ? '1px solid #bbf7d0' : '1px solid #fed7aa',
        padding: '3px 8px',
        borderRadius: 8,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease',
      }}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: checked ? '#15803d' : '#ea580c',
        }}
      >
        {currentStatus}
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={tooltipText}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(!checked);
        }}
        style={{
          position: 'relative',
          width: 36,
          height: 20,
          borderRadius: 20,
          background: checked ? '#16a34a' : '#cbd5e1',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: 2,
          transition: 'background 0.2s ease',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transform: checked ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
    </div>
  );
};

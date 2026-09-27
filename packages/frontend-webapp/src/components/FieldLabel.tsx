import React, { useState } from 'react';

export interface FieldLabelProps {
  label: React.ReactNode;
  tooltip?: string;
  required?: boolean;
  htmlFor?: string;
  style?: React.CSSProperties;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({
  label,
  tooltip,
  required,
  htmlFor,
  style,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
        ...style,
      }}
    >
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#334155',
          cursor: htmlFor ? 'pointer' : 'default',
        }}
      >
        {label}
        {required && (
          <span style={{ color: '#e11d48', marginLeft: 4, fontWeight: 700 }}>*</span>
        )}
      </label>

      {tooltip && (
        <div
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span
            tabIndex={0}
            role="button"
            aria-label={tooltip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'help',
              border: '1px solid #cbd5e1',
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
          >
            ⓘ
          </span>

          {showTooltip && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#0f172a',
                color: '#f8fafc',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: '0.74rem',
                fontWeight: 400,
                lineHeight: 1.4,
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                whiteSpace: 'normal',
                width: 'max-content',
                maxWidth: 240,
                zIndex: 1000,
                pointerEvents: 'none',
              }}
            >
              {tooltip}
              {/* Tooltip arrow */}
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid #0f172a',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

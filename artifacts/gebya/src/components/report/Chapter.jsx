// Chapter.jsx — Shared wrapper for all sections.
// Provides consistent styling, expand/collapse, and doorway behavior.

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Chapter({
  title,
  subtitle,
  children,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  badge,
  hidden = false,
  action,
  className = '',
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!isExpanded);
    } else {
      setInternalExpanded(prev => !prev);
    }
  };

  if (hidden) return null;

  return (
    <section
      className={`chapter ${className}`}
      style={{
        background: '#fff',
        border: '1px solid var(--color-border, #ece6d6)',
        borderRadius: 'var(--radius-md, 12px)',
        boxShadow: 'var(--shadow-xs, 0 2px 8px -4px rgba(0,0,0,0.08))',
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible, acts as doorway */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '14px 16px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 900,
              color: '#1f2937',
              lineHeight: 1.2,
            }}>
              {title}
            </h3>
            {badge && (
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#fff',
                background: badge.color || '#1B4332',
                padding: '2px 6px',
                borderRadius: 999,
                lineHeight: 1.3,
              }}>
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{
              fontSize: 11,
              color: '#9ca3af',
              fontWeight: 600,
              marginTop: 2,
            }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {action}
          <ChevronDown
            className="w-4 h-4"
            style={{
              color: '#d1d5db',
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s ease-in-out',
              flexShrink: 0,
            }}
          />
        </div>
      </button>

      {/* Content — expands inline */}
      {isExpanded && (
        <div style={{
          padding: '0 16px 16px',
          borderTop: '1px solid #f3f4f6',
        }}>
          {children}
        </div>
      )}
    </section>
  );
}

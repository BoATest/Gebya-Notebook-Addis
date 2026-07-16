import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function KnowledgeSection({
  title,
  subtitle,
  children,
  defaultExpanded = false,
  badge,
  sectionId,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section
      {...(sectionId ? { 'data-section': sectionId } : {})}
      style={{
        background: '#fff',
        border: '1px solid #ece6d6',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 16px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 900, color: '#1f2937', lineHeight: 1.2 }}>
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
              }}>
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 1 }}>
              {subtitle}
            </p>
          )}
        </div>
        <ChevronDown
          className="w-4 h-4"
          style={{
            color: '#d1d5db',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease-in-out',
            flexShrink: 0,
          }}
        />
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f3f4f6' }}>
          {children}
        </div>
      )}
    </section>
  );
}

// StoryCard.jsx — "Is my shop okay?"
//
// The first thing the owner sees. Adapts based on business reality.
// Never shows raw numbers without context.

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fmt } from '../../utils/numformat';

const STYLES = {
  healthy: {
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
    border: '#bbf7d0',
    headlineColor: '#1B4332',
    numberColor: '#16a34a',
  },
  warning: {
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    border: '#fde68a',
    headlineColor: '#92400e',
    numberColor: '#d97706',
  },
  urgent: {
    bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
    border: '#fecaca',
    headlineColor: '#991b1b',
    numberColor: '#dc2626',
  },
};

export default function StoryCard({ story, hidden = false, lang = 'en' }) {
  const [expanded, setExpanded] = useState(false);
  if (!story) return null;

  const style = STYLES[story.status] || STYLES.healthy;
  const net = story.net || 0;
  const netDisplay = hidden ? '••••' : `${net >= 0 ? '+' : ''}${fmt(Math.abs(net))}`;

  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: 14,
      padding: 20,
      marginBottom: 12,
    }}>
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>{story.emoji}</span>
        <span style={{ fontSize: 15, fontWeight: 900, color: style.headlineColor }}>
          {story.headline}
        </span>
      </div>

      {/* Profit */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 32,
          fontWeight: 900,
          color: style.numberColor,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {netDisplay}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: style.numberColor }}>
          {lang === 'am' ? ' ብር ቀሪ' : 'ETB profit'}
        </span>
      </div>

      {/* Observations — always visible */}
      {story.observations && story.observations.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {story.observations.map((obs, i) => (
            <p key={i} style={{
              fontSize: 12,
              color: '#4b5563',
              fontWeight: 600,
              lineHeight: 1.5,
              marginTop: i > 0 ? 4 : 0,
            }}>
              {obs}
            </p>
          ))}
        </div>
      )}

      {/* Expand for details */}
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 10,
          padding: '6px 0',
          border: 'none',
          background: 'transparent',
          fontSize: 11,
          fontWeight: 800,
          color: style.headlineColor,
          cursor: 'pointer',
        }}
      >
        {lang === 'am' ? 'ተጨማሪ ያሳዩ' : 'Show details'}
        <ChevronDown
          className="w-3.5 h-3.5"
          style={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          marginTop: 8,
          paddingTop: 10,
          borderTop: `1px solid ${style.border}`,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                {lang === 'am' ? 'ሽያጭ' : 'Sold'}
              </p>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#16a34a', marginTop: 2 }}>
                {hidden ? '••••' : fmt(story.metrics?.totalSold || 0)}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                {lang === 'am' ? 'ወጪ' : 'Spent'}
              </p>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#dc2626', marginTop: 2 }}>
                {hidden ? '••••' : fmt(story.metrics?.spentToday || 0)}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                {lang === 'am' ? 'ሽያጭ ብዛት' : 'Sales'}
              </p>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#374151', marginTop: 2 }}>
                {story.metrics?.saleRows?.length || 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

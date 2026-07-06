/**
 * LearningInsights — surfaces "the app noticed a pattern" moments to the user.
 * Shown on the dashboard/home screen when there are learnable patterns.
 */
import { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { generateInsights } from '../utils/learningEngine';

export default function LearningInsights() {
  const { lang } = useLang();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    generateInsights()
      .then((result) => {
        if (mounted) {
          setInsights(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading || insights.length === 0) return null;

  const icon = (type) => {
    switch (type) {
      case 'time_pattern': return '\u{1F552}'; // clock
      case 'price_stable': return '\u{1F4B0}'; // money bag
      case 'low_acceptance': return '\u{1F4A1}'; // lightbulb
      default: return '\u{1F4CC}'; // pin
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#6b7280' }}>
        {lang === 'am' ? '\u1348\u1275\u1295\u1235 \u12A0\u1295\u12F3' : 'Insights'}
      </p>
      {insights.map((insight, i) => (
        <div
          key={`${insight.type}-${insight.catalog_entry_id}-${i}`}
          className="flex items-start gap-2 p-2.5 border"
          style={{
            borderColor: '#e8e2d8',
            borderRadius: 'var(--radius-sm)',
            background: '#fafaf8',
            fontSize: 12,
          }}
        >
          <span className="text-base flex-shrink-0 mt-0.5">{icon(insight.type)}</span>
          <div className="min-w-0">
            <p className="font-bold" style={{ color: '#111827' }}>
              {insight.message}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              {insight.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

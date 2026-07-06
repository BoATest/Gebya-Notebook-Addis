/**
 * OverdueCustomerFlags — internal-only flag showing customers with 60+ days overdue
 * and no repayment pattern. Gives the shop owner real value today.
 */
import { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { getOverdueCustomerFlags } from '../utils/trustScore';

function fmtBirr(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-US');
}

export default function OverdueCustomerFlags() {
  const { lang } = useLang();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    getOverdueCustomerFlags()
      .then((result) => {
        if (mounted) {
          setFlags(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading || flags.length === 0 || dismissed) return null;

  return (
    <div
      className="border p-3 mb-3"
      style={{
        borderColor: '#fecaca',
        borderRadius: 'var(--radius-sm)',
        background: '#fef2f2',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#991b1b' }}>
          {lang === 'am' ? '\u1240\u1273\u1293 \u12A0\u1295\u12F3 \u1233\u1276\u128B\u1276\u1289\u1289' : 'Overdue Customers'}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-[10px] font-bold"
          style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {lang === 'am' ? '\u12AB\u1295\u12F3' : 'Dismiss'}
        </button>
      </div>
      <div className="space-y-1.5">
        {flags.slice(0, 5).map((flag) => (
          <div
            key={flag.customer_id}
            className="flex items-center justify-between text-xs"
            style={{ color: '#111827' }}
          >
            <div className="min-w-0">
              <span className="font-bold">{flag.display_name}</span>
              <span className="ml-1" style={{ color: '#6b7280' }}>
                — {fmtBirr(flag.outstanding_amount)} ETB
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span style={{ color: flag.risk_level === 'high' ? '#dc2626' : '#d97706', fontSize: 10, fontWeight: 700 }}>
                {flag.oldest_unpaid_days}d
              </span>
              {flag.has_recent_payment && (
                <span style={{ color: '#16a34a', fontSize: 9 }}>recent pay</span>
              )}
            </div>
          </div>
        ))}
        {flags.length > 5 && (
          <p className="text-[10px]" style={{ color: '#9ca3af' }}>
            +{flags.length - 5} {lang === 'am' ? '\u12E8\u121A\u130D\u1295\u1233' : 'more'}
          </p>
        )}
      </div>
    </div>
  );
}

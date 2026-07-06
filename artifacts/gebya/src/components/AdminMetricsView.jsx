/**
 * AdminMetricsView — impact metrics for future grant/NBE/DFI conversations.
 * Read-only dashboard showing aggregate shop performance.
 */
import { useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { computeImpactMetrics } from '../utils/entitlements';
import { getTrustScores } from '../utils/trustScore';

function fmtBirr(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-US');
}

export default function AdminMetricsView({ shopId }) {
  const { lang } = useLang();
  const [metrics, setMetrics] = useState(null);
  const [trustScores, setTrustScores] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      computeImpactMetrics(),
      getTrustScores(shopId),
    ]).then(([m, ts]) => {
      if (mounted) {
        setMetrics(m);
        setTrustScores(ts);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [shopId]);

  if (loading) return <div className="p-4 text-sm" style={{ color: '#6b7280' }}>Loading metrics...</div>;
  if (!metrics) return null;

  const rows = [
    { label: lang === 'am' ? '\u1265\u1228\u1275\u1295\u1235 \u1260\u1233\u1295\u129B' : 'Shops onboarded', value: metrics.shops_onboarded },
    { label: lang === 'am' ? '\u1260\u12AB\u1295\u1295 \u1230\u1276\u128A\u1276' : 'Months active', value: metrics.months_active },
    { label: lang === 'am' ? '\u1240\u1295\u12F5 \u1230\u1276\u128A\u1276' : 'Total transactions', value: fmtBirr(metrics.total_transactions) },
    { label: lang === 'am' ? '\u1228\u1275\u1235 \u1230\u1276\u128A\u1276/\u1263\u1229' : 'Monthly transaction rate', value: `${fmtBirr(metrics.monthly_transaction_rate)}/mo` },
    { label: lang === 'am' ? '\u1230\u1228\u1273 \u1230\u1276\u128A\u1276 (\u1265\u122A)' : 'Total sales (birr)', value: `${fmtBirr(metrics.total_sales_birr)} ETB` },
    { label: lang === 'am' ? '\u1233\u1228\u129B \u1230\u1276\u128A\u1276 (\u1265\u122A)' : 'Total expenses (birr)', value: `${fmtBirr(metrics.total_expenses_birr)} ETB` },
    { label: lang === 'am' ? '\u12AE\u1273\u1295 \u1230\u1276\u128A\u1276 (\u1265\u122A)' : 'Credit extended (birr)', value: `${fmtBirr(metrics.total_credit_extended_birr)} ETB` },
    { label: lang === 'am' ? '\u12AE\u1273\u1295 \u122A\u1275\u129B (\u1265\u122A)' : 'Credit repaid (birr)', value: `${fmtBirr(metrics.total_credit_repaid_birr)} ETB` },
    { label: lang === 'am' ? '\u12AE\u1273\u1295 \u122A\u1275\u129B \u��ንveau' : 'Credit recovery rate', value: `${metrics.credit_recovery_rate}%` },
    { label: lang === 'am' ? '\u12E8\u121A\u130D\u1295\u1233\u1295\u1289' : 'Unique customers', value: metrics.unique_customers },
    { label: lang === 'am' ? '\u1245\u1295\u1297\u1287\u1293 \u1270\u1268\u1276\u1295\u1233' : 'Active staff', value: metrics.active_staff },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#6b7280' }}>
        {lang === 'am' ? '\u1218\u1295\u130D\u1295\u1233 \u1230\u1276\u128A\u1276' : 'Impact Metrics'}
      </p>
      <p className="text-[10px] italic" style={{ color: '#9ca3af' }}>
        Behavioral consistency signal, unvalidated
      </p>
      <div className="border divide-y" style={{ borderColor: '#e8e2d8', borderRadius: 'var(--radius-sm)' }}>
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between px-3 py-2">
            <span className="text-xs font-bold" style={{ color: '#374151' }}>{row.label}</span>
            <span className="text-xs font-black" style={{ color: '#111827' }}>{row.value}</span>
          </div>
        ))}
      </div>
      {trustScores && (
        <div className="border p-3" style={{ borderColor: '#e8e2d8', borderRadius: 'var(--radius-sm)' }}>
          <p className="text-[11px] font-black uppercase tracking-wide mb-2" style={{ color: '#6b7280' }}>
            {lang === 'am' ? '\u1233\u1295\u1293 \u12E8\u121A\u130D\u1295\u1233' : 'Trust Scores'}
          </p>
          <div className="flex gap-4">
            <div>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Data Integrity</p>
              <p className="text-lg font-black" style={{ color: '#14532d' }}>{trustScores.data_integrity_score}/100</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Business Health</p>
              <p className="text-lg font-black" style={{ color: '#14532d' }}>{trustScores.business_health_score}/100</p>
            </div>
          </div>
          <p className="text-[9px] mt-1" style={{ color: '#9ca3af' }}>
            v{trustScores.score_version} | computed {new Date(trustScores.computed_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

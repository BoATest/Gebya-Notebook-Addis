/**
 * BankDashboard — standalone page for bank officers to view shop analytics.
 *
 * This is a separate entry point from the merchant PWA.
 * Bank officers authenticate with their bank credentials and see
 * shops that have granted them data access.
 */
import { useState, useEffect, useCallback } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

// --- CSV Export ---

function exportReportCsv(report) {
  const lines = [];
  lines.push('Shop Report');
  lines.push(`Shop,${report.shop.name}`);
  lines.push(`Generated,${report.generated_at}`);
  lines.push('');

  lines.push('Summary');
  lines.push(`Total Sales (birr),${report.impact_metrics.total_sales_birr}`);
  lines.push(`Total Expenses (birr),${report.impact_metrics.total_expenses_birr}`);
  lines.push(`Credit Extended (birr),${report.impact_metrics.total_credit_extended_birr}`);
  lines.push(`Credit Repaid (birr),${report.impact_metrics.total_credit_repaid_birr}`);
  lines.push(`Recovery Rate,${report.summary.average_repayment_rate}%`);
  lines.push(`Customers with Credit,${report.summary.total_customers_with_credit}`);
  lines.push(`Outstanding (birr),${report.summary.total_outstanding_birr}`);
  lines.push('');

  lines.push('Monthly Trend');
  lines.push('Month,Sales (birr),Expenses (birr),Credit Extended (birr),Credit Repaid (birr),Transactions');
  for (const m of report.monthly_summary.filter((m) => m.transaction_count > 0)) {
    lines.push(`${m.month},${m.total_sales_birr},${m.total_expenses_birr},${m.credit_extended_birr},${m.credit_repaid_birr},${m.transaction_count}`);
  }
  lines.push('');

  if (report.customer_summaries.length > 0) {
    lines.push('Customer Credit Details');
    lines.push('Customer ID,Credit Extended (birr),Repaid (birr),Outstanding (birr),Repayment Rate,Credit Count,Oldest Credit (days)');
    for (const c of report.customer_summaries) {
      lines.push(`${c.customer_id},${c.total_credit_extended},${c.total_repaid},${c.outstanding_balance},${c.repayment_rate}%,${c.credit_count},${c.oldest_credit_days}`);
    }
  }

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gebya-report-${report.shop.name.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    credentials: 'include',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

// --- Login Form ---

function BankLoginForm({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRequestOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/otp', null, {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone }),
      });
      setOtpSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch('/auth/verify', null, {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone, otp }),
      });
      if (result.token) {
        onLogin(result.token);
      } else {
        setError('No token received');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          fontSize: '1.4rem', color: '#fff', fontWeight: 900,
        }}>
          GB
        </div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#374151', marginBottom: 4 }}>
          Gebya Bank Portal
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          View merchant analytics and credit data
        </p>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#dc2626',
          fontSize: '0.75rem', marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="tel"
          placeholder="+251 9XX XXX XXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={otpSent}
          style={{
            padding: '12px 16px', borderRadius: 10, border: '1px solid #d1d5db',
            fontSize: '0.85rem', background: otpSent ? '#f9fafb' : '#fff',
          }}
        />

        {otpSent && (
          <input
            type="text"
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            style={{
              padding: '12px 16px', borderRadius: 10, border: '1px solid #d1d5db',
              fontSize: '0.85rem', letterSpacing: 4, textAlign: 'center',
            }}
          />
        )}

        <button
          type="button"
          onClick={otpSent ? handleVerify : handleRequestOtp}
          disabled={loading || !phone || (otpSent && otp.length < 6)}
          style={{
            padding: '12px 0', borderRadius: 10, border: 'none',
            background: (!phone || (otpSent && otp.length < 6)) ? '#d1d5db' : '#1B4332',
            color: '#fff', fontSize: '0.85rem', fontWeight: 700,
            cursor: (!phone || (otpSent && otp.length < 6)) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '...' : otpSent ? 'Verify OTP' : 'Send OTP'}
        </button>
      </div>
    </div>
  );
}

// --- Shop List ---

function ShopList({ token, onSelect }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/analytics/shops', token)
      .then((d) => setShops(d.shops || []))
      .catch(() => setShops([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Loading shops...</div>;
  if (shops.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ fontSize: '2rem', marginBottom: 12 }}>🏪</p>
      <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>No shops have shared data with your bank yet.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
      {shops.map((shop) => (
        <button
          key={shop.shareId}
          type="button"
          onClick={() => onSelect(shop.businessId)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderRadius: 12, border: '1px solid #e5e7eb',
            background: '#fff', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{shop.shop_name}</p>
            <p style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
              Shared {shop.shareCreditData ? '· Credit' : ''} {shop.shareSalesData ? '· Sales' : ''}
            </p>
          </div>
          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>→</span>
        </button>
      ))}
    </div>
  );
}

// --- Shop Report View ---

function ShopReport({ token, businessId, onBack }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/analytics/shop/${businessId}`, token)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, businessId]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>Loading report...</div>;
  if (error) return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>
      <button onClick={onBack} style={{ fontSize: '0.8rem', color: '#1B4332', background: 'none', border: 'none', cursor: 'pointer' }}>
        ← Back to shops
      </button>
    </div>
  );
  if (!report) return null;

  const m = report.impact_metrics;
  const s = report.summary;

  return (
    <div style={{ padding: '0 4px' }}>
      <button
        onClick={onBack}
        style={{ fontSize: '0.8rem', color: '#1B4332', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}
      >
        ← Back to shops
      </button>

      <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#374151', marginBottom: 4 }}>{report.shop.name}</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
          Report generated {new Date(report.generated_at).toLocaleDateString()}
        </p>
        <button
          onClick={() => exportReportCsv(report)}
          style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db',
            background: '#fff', fontSize: '0.75rem', color: '#374151', cursor: 'pointer',
          }}
        >
          Download CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Sales', value: ` birr${m.total_sales_birr.toLocaleString()}`, color: '#1B4332' },
          { label: 'Outstanding Credit', value: ` birr${s.total_outstanding_birr.toLocaleString()}`, color: '#dc2626' },
          { label: 'Recovery Rate', value: `${s.average_repayment_rate}%`, color: '#2563eb' },
          { label: 'Customers with Credit', value: s.total_customers_with_credit, color: '#7c3aed' },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            padding: '14px', borderRadius: 12, background: '#f9fafb', border: '1px solid #e5e7eb',
          }}>
            <p style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: 4 }}>{kpi.label}</p>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Trend */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>Monthly Trend</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {report.monthly_summary.filter((m) => m.transaction_count > 0).map((m) => (
            <div key={m.month} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: 8, background: '#f9fafb',
              fontSize: '0.75rem',
            }}>
              <span style={{ color: '#374151', fontWeight: 600 }}>{m.month}</span>
              <span style={{ color: '#6b7280' }}>
                Sales: birr{m.total_sales_birr.toLocaleString()} · Credit: birr{m.credit_extended_birr.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Breakdown */}
      {report.customer_summaries.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>
            Customer Credit ({report.customer_summaries.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.customer_summaries.map((c) => (
              <div key={c.customer_id} style={{
                padding: '12px', borderRadius: 10, border: '1px solid #e5e7eb',
                fontSize: '0.75rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: '#374151' }}>
                    {c.display_name || `Customer ${c.customer_id}`}
                  </span>
                  <span style={{ color: c.outstanding_balance > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                    birr{c.outstanding_balance.toLocaleString()} outstanding
                  </span>
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                  Repaid: {c.repayment_rate}% · {c.credit_count} credits · {c.oldest_credit_days} days oldest
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Dashboard ---

export default function BankDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem('gebya_bank_token'));
  const [selectedShop, setSelectedShop] = useState(null);

  const handleLogin = useCallback((newToken) => {
    localStorage.setItem('gebya_bank_token', newToken);
    setToken(newToken);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('gebya_bank_token');
    setToken(null);
    setSelectedShop(null);
  }, []);

  if (!token) return <BankLoginForm onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', color: '#fff', fontWeight: 900,
          }}>
            GB
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Bank Portal</span>
        </div>
        <button
          onClick={handleLogout}
          style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', maxWidth: 480, margin: '0 auto' }}>
        {selectedShop ? (
          <ShopReport token={token} businessId={selectedShop} onBack={() => setSelectedShop(null)} />
        ) : (
          <ShopList token={token} onSelect={setSelectedShop} />
        )}
      </div>
    </div>
  );
}

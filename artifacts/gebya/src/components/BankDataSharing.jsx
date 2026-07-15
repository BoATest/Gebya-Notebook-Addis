/**
 * BankDataSharing — merchant-side consent panel.
 * Shows which banks have access, lets merchant grant/revoke.
 */
import { useState, useEffect } from 'react';
import { getDeviceToken } from '../db';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

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

const BANKS = [
  { id: 'cbe', name: 'Commercial Bank of Ethiopia', nameAm: 'የኢትዮጵያ ንግድ ባንክ' },
  { id: 'dashen', name: 'Dashen Bank', nameAm: 'ዳшен ባንክ' },
  { id: 'awash', name: 'Awash Bank', nameAm: 'አዋሽ ባንክ' },
  { id: 'wegagen', name: 'Wegagen Bank', nameAm: 'ወጋገን ባንክ' },
  { id: 'nbe', name: 'National Bank of Ethiopia (NBE)', nameAm: 'የኢትዮጵያ ብሔራዊ ባንክ' },
];

export default function BankDataSharing({ shopId, lang }) {
  const [token, setToken] = useState(null);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeviceToken().then((t) => {
      setToken(t);
      if (!t) { setLoading(false); return; }
      apiFetch('/analytics/shares', t)
        .then((d) => setShares(d.shares || []))
        .catch(() => setShares([]))
        .finally(() => setLoading(false));
    });
  }, [shopId]);
  const [showGrant, setShowGrant] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [opts, setOpts] = useState({ sales: true, credit: true, customer: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleGrant = async () => {
    if (!selectedBank) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/analytics/share', token, {
        method: 'POST',
        body: JSON.stringify({
          bankName: selectedBank,
          shareSalesData: opts.sales,
          shareCreditData: opts.credit,
          shareCustomerData: opts.customer,
        }),
      });
      // Refresh
      const d = await apiFetch('/analytics/shares', token);
      setShares(d.shares || []);
      setShowGrant(false);
      setSelectedBank('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (shareId) => {
    if (!confirm(lang === 'am' ? 'ይህን ባንክ ይቀሩ?' : 'Revoke access for this bank?')) return;
    try {
      await apiFetch(`/analytics/share/${shareId}`, token, { method: 'DELETE' });
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch (e) {
      setError(e.message);
    }
  };

  const t = {
    title: lang === 'am' ? 'የባንክ ውሂብ ማጋራት' : 'Bank Data Sharing',
    subtitle: lang === 'am'
      ? 'ንግድ መረጃዎን ከባንኮች ጋር ያጋሩ'
      : 'Share your business data with banks for credit scoring',
    noShares: lang === 'am'
      ? 'ምንም ባንክ አልተጋራም'
      : 'No banks have access yet',
    grantAccess: lang === 'am' ? 'ባንክ ያክሉ' : 'Grant Access',
    revoke: lang === 'am' ? 'ይቀሩ' : 'Revoke',
    active: lang === 'am' ? 'ንቁ' : 'Active',
    selectBank: lang === 'am' ? 'ባንክ ይምረጡ' : 'Select a bank',
    shareOptions: lang === 'am' ? 'የማጋራት ምርጫዎች' : 'What to share',
    salesData: lang === 'am' ? 'የሽያጭ መረጃ' : 'Sales data',
    creditData: lang === 'am' ? 'የቪ딧 መረጃ' : 'Credit (dubie) data',
    customerData: lang === 'am' ? 'የደንበኛ መረጃ (ስም፣ ስልክ)' : 'Customer info (name, phone)',
    customerDataHint: lang === 'am' ? '⚠️ ስም እና ስልክ ብቻ' : '⚠️ Includes PII — opt-in only',
    confirm: lang === 'am' ? 'ያረጋግጡ' : 'Confirm',
    cancel: lang === 'am' ? 'ሰርዝ' : 'Cancel',
  };

  return (
    <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden">
      <div className="px-5 py-4">
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{t.title}</p>
        <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 2 }}>{t.subtitle}</p>
      </div>

      {error && (
        <div className="mx-5 mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: '#fef2f2', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-5 pb-4 text-xs text-gray-400">Loading...</div>
      ) : shares.length === 0 && !showGrant ? (
        <div className="px-5 pb-4">
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 12 }}>{t.noShares}</p>
          <button
            type="button"
            onClick={() => setShowGrant(true)}
            className="press-scale"
            style={{
              width: '100%', padding: '10px 0', borderRadius: 12, border: '1px dashed #1B4332',
              background: 'rgba(27,67,50,0.04)', color: '#1B4332', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + {t.grantAccess}
          </button>
        </div>
      ) : (
        <div className="px-5 pb-4 space-y-2">
          {shares.map((share) => {
            const bank = BANKS.find((b) => b.id === share.bankName || b.name === share.bankName);
            return (
              <div key={share.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                    {bank ? (lang === 'am' ? bank.nameAm : bank.name) : share.bankName}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                    {t.active} · {share.shareCreditData ? 'Dubie' : ''}
                    {share.shareSalesData ? ' · Sales' : ''}
                    {share.shareCustomerData ? ' · PII' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(share.id)}
                  style={{
                    fontSize: '0.7rem', color: '#dc2626', background: 'none',
                    border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px',
                    cursor: 'pointer',
                  }}
                >
                  {t.revoke}
                </button>
              </div>
            );
          })}

          {!showGrant && (
            <button
              type="button"
              onClick={() => setShowGrant(true)}
              className="press-scale"
              style={{
                width: '100%', padding: '10px 0', borderRadius: 12, border: '1px dashed #1B4332',
                background: 'rgba(27,67,50,0.04)', color: '#1B4332', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', marginTop: 8,
              }}
            >
              + {t.grantAccess}
            </button>
          )}
        </div>
      )}

      {showGrant && (
        <div className="px-5 pb-4 space-y-3">
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>{t.selectBank}</label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              style={{
                width: '100%', marginTop: 4, padding: '8px 12px', borderRadius: 8,
                border: '1px solid #d1d5db', fontSize: '0.8rem',
              }}
            >
              <option value="">{t.selectBank}</option>
              {BANKS.filter((b) => b.id !== 'nbe').map((b) => (
                <option key={b.id} value={b.id}>{lang === 'am' ? b.nameAm : b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>
              {t.shareOptions}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', marginBottom: 4 }}>
              <input type="checkbox" checked={opts.sales} onChange={(e) => setOpts({ ...opts, sales: e.target.checked })} />
              {t.salesData}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', marginBottom: 4 }}>
              <input type="checkbox" checked={opts.credit} onChange={(e) => setOpts({ ...opts, credit: e.target.checked })} />
              {t.creditData}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', marginBottom: 4 }}>
              <input type="checkbox" checked={opts.customer} onChange={(e) => setOpts({ ...opts, customer: e.target.checked })} />
              {t.customerData}
            </label>
            <p style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: 4 }}>{t.customerDataHint}</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowGrant(false)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #d1d5db',
                background: '#fff', fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleGrant}
              disabled={!selectedBank || saving}
              className="press-scale"
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                background: selectedBank ? '#1B4332' : '#d1d5db',
                color: '#fff', fontSize: '0.8rem', fontWeight: 600,
                cursor: selectedBank ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? '...' : t.confirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

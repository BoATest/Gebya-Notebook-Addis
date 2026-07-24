import { useState, useMemo } from 'react';
import { X, Search, ArrowRightLeft } from 'lucide-react';
import { fmt, fmtInput, parseInput } from '../utils/numformat';
import { useLang } from '../context/LangContext';

export default function TransferSheet({
  sourceCustomer,
  customers = [],
  onSave,
  onClose,
}) {
  const { lang } = useLang();
  const [targetQuery, setTargetQuery] = useState('');
  const [targetCustomer, setTargetCustomer] = useState(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const sourceBalance = Math.max(Number(sourceCustomer?.balance || 0), 0);

  const filteredTargets = useMemo(() => {
    if (!targetQuery.trim()) return [];
    const q = targetQuery.toLowerCase();
    return customers.filter(c =>
      c.id !== sourceCustomer?.id
      && (c.display_name || c.name || '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [customers, targetQuery, sourceCustomer]);

  const rawAmount = parseInput(amount);
  const isValidAmount = rawAmount > 0 && rawAmount <= sourceBalance;
  const canSave = targetCustomer && isValidAmount && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        sourceCustomerId: sourceCustomer.id,
        targetCustomerId: targetCustomer.id,
        amount: rawAmount,
        sourceName: sourceCustomer.display_name || sourceCustomer.name || '',
        targetName: targetCustomer.display_name || targetCustomer.name || '',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'gebya-fade-in 0.15s ease',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 32px -8px rgba(0,0,0,0.25)',
          animation: 'gebya-slide-up 0.25s ease',
        }}
      >
        <div style={{ width: 38, height: 4, background: '#e5e7eb', borderRadius: 999, margin: '10px auto 0', flexShrink: 0 }} />

        <div style={{
          padding: '8px 16px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #f3f4f6',
          flexShrink: 0,
        }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1a1a', margin: 0 }}>
            <ArrowRightLeft className="w-4 h-4" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#C4883A' }} />
            {lang === 'am' ? 'ዱቤ ማስተላለፍ' : 'Transfer Credit'}
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#f3f4f6', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X className="w-4 h-4" style={{ color: '#6b7280' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Source customer */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {lang === 'am' ? 'ከ' : 'From'}
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 10,
              border: '1px solid #ece6d6', background: '#fafaf5',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#1B4332', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
              }}>
                {(sourceCustomer?.display_name || sourceCustomer?.name || '?')[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1f2937' }}>
                  {sourceCustomer?.display_name || sourceCustomer?.name}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                  {lang === 'am' ? 'የአሁን ዱቤ' : 'Current balance'}: {fmt(sourceBalance)} {lang === 'am' ? 'ብር' : 'birr'}
                </p>
              </div>
            </div>
          </div>

          {/* Target customer search */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {lang === 'am' ? 'ለማን' : 'To'}
            </p>
            {targetCustomer ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 10,
                border: '1px solid #16a34a', background: '#f0fdf4',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#16a34a', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
                }}>
                  {(targetCustomer.display_name || targetCustomer.name || '?')[0]}
                </div>
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 700, color: '#1f2937' }}>
                  {targetCustomer.display_name || targetCustomer.name}
                </span>
                <button
                  type="button"
                  onClick={() => { setTargetCustomer(null); setTargetQuery(''); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X className="w-4 h-4" style={{ color: '#9ca3af' }} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: '1px solid #e5e7eb', borderRadius: 10,
                  padding: '6px 10px', minHeight: 38,
                }}>
                  <Search className="w-4 h-4" style={{ color: '#9ca3af', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={targetQuery}
                    onChange={e => setTargetQuery(e.target.value)}
                    placeholder={lang === 'am' ? 'የደንበኛ ስም ይተይቡ...' : 'Type customer name...'}
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: '0.8rem',
                      fontWeight: 600, color: '#374151',
                      background: 'transparent', minHeight: 28,
                    }}
                  />
                </div>
                {filteredTargets.length > 0 && (
                  <div style={{
                    marginTop: 4, border: '1px solid #ece6d6', borderRadius: 10,
                    maxHeight: 200, overflowY: 'auto',
                  }}>
                    {filteredTargets.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setTargetCustomer(c); setTargetQuery(''); }}
                        style={{
                          width: '100%', padding: '10px 12px', textAlign: 'left',
                          border: 'none', borderBottom: '1px solid #f3f4f6',
                          background: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          fontSize: '0.82rem', fontWeight: 600, color: '#1f2937',
                          minHeight: 44,
                        }}
                      >
                        <span>{c.display_name || c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {lang === 'am' ? 'መጠን' : 'Amount'}
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: `1px solid ${isValidAmount ? '#16a34a' : '#e5e7eb'}`,
              borderRadius: 10, padding: '6px 12px', minHeight: 44,
            }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#6b7280' }}>
                {lang === 'am' ? 'ብር' : 'birr'}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(fmtInput(e.target.value))}
                placeholder="0"
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: '1.1rem',
                  fontWeight: 800, color: '#1f2937', textAlign: 'right',
                  background: 'transparent', minHeight: 36,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </div>
            {sourceBalance > 0 && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[Math.round(sourceBalance), Math.round(sourceBalance / 2)].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
                      background: '#f9fafb', fontSize: '0.72rem', fontWeight: 600,
                      color: '#374151', cursor: 'pointer', minHeight: 30,
                    }}
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>
            )}
            {rawAmount > sourceBalance && (
              <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 4 }}>
                {lang === 'am' ? 'መጠኑ ከዱቤው ይበልጣል' : 'Amount exceeds available balance'}
              </p>
            )}
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              border: 'none', fontSize: '0.85rem', fontWeight: 800,
              background: canSave ? '#1B4332' : '#e5e7eb',
              color: canSave ? '#fff' : '#9ca3af',
              cursor: canSave ? 'pointer' : 'not-allowed',
              minHeight: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving ? (lang === 'am' ? 'በማስተላለፍ ላይ...' : 'Transferring...') : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                {lang === 'am' ? 'ዱቤ አስተላልፍ' : 'Transfer Credit'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
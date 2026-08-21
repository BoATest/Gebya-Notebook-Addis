import { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useSyncStore } from '../stores/syncStore';
import { getSyncEngine, getAuthToken } from '../utils/syncEngine';
import { useLang } from '../context/LangContext';

function timeAgo(ts) {
  if (!ts) return 'never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function SyncDiagnosticSheet({ open, onClose, pwaOnline, onSignIn }) {
  const { t, lang } = useLang();
  const status = useSyncStore((s) => s.status);
  const error = useSyncStore((s) => s.error);
  const online = useSyncStore((s) => s.online);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const businessId = useSyncStore((s) => s.businessId);
  const [hasToken, setHasToken] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let alive = true;
    getAuthToken().then((tok) => { if (alive) setHasToken(Boolean(tok)); }).catch(() => { if (alive) setHasToken(false); });
    return () => { alive = false; };
  }, [open]);

  if (!open) return null;

  const retry = async () => {
    setRetrying(true);
    try { await getSyncEngine().sync(); } finally { setRetrying(false); }
  };

  const am = lang === 'am';
  const rows = [
    { k: am ? 'ሁኔታ' : 'Status', v: status },
    { k: am ? 'የኤንጂን ኔትወርክ' : 'Engine online', v: online ? (am ? 'አዎ' : 'yes') : (am ? 'አልሆነም' : 'no') },
    { k: am ? 'የመተግበሪያ ኔትወርክ' : 'App online', v: pwaOnline ? (am ? 'አዎ' : 'yes') : (am ? 'አልሆነም' : 'no') },
    { k: am ? 'የማጠቃለያ ምልክት' : 'Auth token', v: hasToken == null ? '…' : hasToken ? (am ? 'አለ' : 'present') : (am ? 'የለም' : 'missing') },
    { k: am ? 'ለማመሳሰል ያሉ ሪከርዶች' : 'Pending records', v: String(pendingCount) },
    { k: am ? 'የመጨረሻ ማመሳሰል' : 'Last sync', v: timeAgo(lastSyncAt) },
    { k: am ? 'የንግድ መለያ' : 'Business ID', v: businessId ? String(businessId) : (am ? 'የለም' : 'none') },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={am ? 'የማመሳሰል ሁኔታ' : 'Sync status'}
    >
      <div
        className="w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 16 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold" style={{ color: 'var(--color-text)' }}>
            {am ? 'የማመሳሰል ሁኔታ' : 'Sync status'}
          </h2>
          <button type="button" onClick={onClose} className="press-scale" style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer' }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p className="text-[12px] leading-snug mb-3" style={{ color: 'var(--color-muted)' }}>
          {am
            ? 'ማመሳሰል ራስ-በራሱ ነው። ሰብሳቢዎት ውሂብ ይመለሳል፣ እርስዎ ምንም መጫን የለበትም። ካልሆነ፣ ስህተቱ ከታች ነው።'
            : 'Sync is automatic — your data backs up in the background, you do nothing. If it is stuck, the error below tells us why.'}
        </p>

        <div className="flex flex-col gap-1 mb-3">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center justify-between text-[13px]" style={{ borderBottom: '1px solid var(--color-border)', padding: '6px 0' }}>
              <span style={{ color: 'var(--color-muted)' }}>{r.k}</span>
              <span className="font-bold truncate ml-2" style={{ color: 'var(--color-text)' }}>{r.v}</span>
            </div>
          ))}
        </div>

        {error && (
          <div
            className="mb-3 p-2 rounded-lg text-[12px] font-mono"
            style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: '#9a3412', wordBreak: 'break-word' }}
          >
            {(am ? 'ስህተት: ' : 'Error: ') + String(error)}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className="press-scale flex-1 flex items-center justify-center gap-1"
            style={{ minHeight: 40, borderRadius: 10, border: 'none', background: 'var(--color-primary)', color: 'var(--color-bg-white)', fontWeight: 800, cursor: retrying ? 'wait' : 'pointer' }}
          >
            <RefreshCw size={16} /> {retrying ? '…' : (am ? 'እንደገና ሞክር' : 'Retry now')}
          </button>
          {typeof onSignIn === 'function' && (status === 'unauthenticated' || !hasToken) && (
            <button
              type="button"
              onClick={onSignIn}
              className="press-scale flex-1"
              style={{ minHeight: 40, borderRadius: 10, border: 'none', background: 'var(--color-info)', color: 'var(--color-bg-white)', fontWeight: 800, cursor: 'pointer' }}
            >
              {am ? 'ለመግቢያ' : 'Sign in'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

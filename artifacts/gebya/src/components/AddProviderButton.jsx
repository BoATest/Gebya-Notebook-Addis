import { useState, useRef, useEffect } from 'react';
import { useLang } from '../context/LangContext';

export default function AddProviderButton({ onAddProvider }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('bank');
  const [name, setName] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddProvider(kind, trimmed);
    setOpen(false);
    setName('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="shrink-0 px-3 py-2 rounded-full text-sm font-bold border-2 border-dashed press-scale"
        style={{
          borderColor: open ? '#1B4332' : '#c9bfa8',
          background: open ? 'rgba(27,67,50,0.06)' : '#faf9f7',
          color: open ? '#1B4332' : '#9ca3af',
          whiteSpace: 'nowrap',
          minHeight: 38,
        }}
        aria-label={lang === 'am' ? 'መክፈያ ዘዴ ጨምር' : 'Add payment method'}
      >
        +
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 50,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #e8e2d8',
            borderRadius: 8,
            padding: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            minWidth: 200,
          }}
        >
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setKind('bank')}
              className="press-scale"
              style={{
                flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 700,
                border: '1px solid', borderRadius: 6,
                borderColor: kind === 'bank' ? '#1B4332' : '#edeae5',
                background: kind === 'bank' ? 'rgba(27,67,50,0.06)' : '#fff',
                color: kind === 'bank' ? '#1B4332' : '#9ca3af',
              }}
            >
              🏦 {lang === 'am' ? 'ባንክ' : 'Bank'}
            </button>
            <button
              type="button"
              onClick={() => setKind('wallet')}
              className="press-scale"
              style={{
                flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 700,
                border: '1px solid', borderRadius: 6,
                borderColor: kind === 'wallet' ? '#1B4332' : '#edeae5',
                background: kind === 'wallet' ? 'rgba(27,67,50,0.06)' : '#fff',
                color: kind === 'wallet' ? '#1B4332' : '#9ca3af',
              }}
            >
              📱 {lang === 'am' ? 'ዋሌት' : 'Wallet'}
            </button>
          </div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            placeholder={lang === 'am' ? 'ስም ያስገቡ...' : 'e.g. Zemen Bank'}
            style={{
              width: '100%', padding: '8px 10px', fontSize: 12,
              border: '1px solid #edeae5', borderRadius: 6,
              outline: 'none', marginBottom: 8,
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="press-scale"
            style={{
              width: '100%', padding: '8px', fontSize: 12, fontWeight: 700,
              border: 'none', borderRadius: 6,
              background: name.trim() ? '#1B4332' : '#e5e7eb',
              color: name.trim() ? '#fff' : '#9ca3af',
              cursor: name.trim() ? 'pointer' : 'default',
            }}
          >
            {lang === 'am' ? 'ጨምር' : 'Add'}
          </button>
        </div>
      )}
    </div>
  );
}

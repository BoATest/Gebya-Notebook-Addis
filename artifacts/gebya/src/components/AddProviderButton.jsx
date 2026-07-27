import { useState, useRef, useEffect, useMemo } from 'react';
import { useLang } from '../context/LangContext';
import { DEFAULT_CHANNEL_DEFINITIONS } from '../utils/paymentChannels';

const CHANNEL_SUGGESTIONS = DEFAULT_CHANNEL_DEFINITIONS.map(d => ({
  kind: d.kind,
  name: d.name,
}));

export default function AddProviderButton({ onAddProvider, existingNames = [] }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('bank');
  const [name, setName] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);
  const btnRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const suggestions = useMemo(() => {
    if (!name.trim()) return [];
    const q = name.toLowerCase().trim();
    const exclude = new Set((existingNames || []).map(n => n.toLowerCase()));
    return CHANNEL_SUGGESTIONS
      .filter(s => s.kind === kind && s.name.toLowerCase().includes(q) && !exclude.has(s.name.toLowerCase()))
      .slice(0, 8);
  }, [name, kind, existingNames]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [name, kind]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 10;
      const popupHeight = 220;
      if (spaceBelow < popupHeight && rect.top > popupHeight) {
        containerRef.current.style.setProperty('--popup-top', `${rect.top - popupHeight}px`);
        containerRef.current.style.setProperty('--popup-right', `${window.innerWidth - rect.right}px`);
        containerRef.current.dataset.position = 'above';
      } else {
        containerRef.current.style.setProperty('--popup-top', `${rect.bottom + 4}px`);
        containerRef.current.style.setProperty('--popup-right', `${window.innerWidth - rect.right}px`);
        containerRef.current.dataset.position = 'below';
      }
    }
    setOpen(!open);
    if (!open) setName('');
  };

  const handleSave = (selected) => {
    const trimmed = (selected || name).trim();
    if (!trimmed) return;
    onAddProvider(kind, trimmed);
    setOpen(false);
    setName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSave(suggestions[selectedIndex].name);
      } else {
        handleSave();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(-1, i - 1));
    }
  };

  return (
    <div ref={containerRef} style={{ flexShrink: 0, position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
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
            position: 'fixed',
            top: containerRef.current?.dataset.position === 'above'
              ? `calc(var(--popup-top, 0px))`
              : `calc(var(--popup-top, 0px))`,
            right: containerRef.current?.dataset.position === 'above'
              ? `calc(var(--popup-right, 0px))`
              : `calc(var(--popup-right, 0px))`,
            zIndex: 9999,
            background: '#fff',
            border: '1px solid #e8e2d8',
            borderRadius: 8,
            padding: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            minWidth: 220,
            maxHeight: 260,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
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
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === 'am' ? 'ስም ያስገቡ...' : 'e.g. Zemen Bank'}
              style={{
                width: '100%', padding: '8px 10px', fontSize: 12,
                border: '1px solid #edeae5', borderRadius: 6,
                outline: 'none', marginBottom: 4,
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            {suggestions.length > 0 && (
              <div
                style={{
                  border: '1px solid #edeae5',
                  borderRadius: 6,
                  maxHeight: 140,
                  overflowY: 'auto',
                  marginBottom: 4,
                }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => { setName(s.name); handleSave(s.name); }}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className="press-scale"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: 12,
                      textAlign: 'left',
                      border: 'none',
                      background: i === selectedIndex ? 'rgba(27,67,50,0.08)' : '#fff',
                      color: '#1a1a1a',
                    }}
                  >
                    {s.kind === 'bank' ? '🏦 ' : '📱 '}{s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={!name.trim()}
            className="press-scale"
            style={{
              width: '100%', padding: '8px', fontSize: 12, fontWeight: 700,
              border: 'none', borderRadius: 6,
              background: name.trim() ? '#1B4332' : '#e5e7eb',
              color: name.trim() ? '#fff' : '#9ca3af',
              cursor: name.trim() ? 'pointer' : 'default',
              flexShrink: 0,
            }}
          >
            {lang === 'am' ? 'ጨምር' : 'Add'}
          </button>
        </div>
      )}
    </div>
  );
}

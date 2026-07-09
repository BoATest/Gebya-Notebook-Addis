import { useRef, useState, useEffect } from 'react';
import { useLang } from '../../context/LangContext';
import { fmt, fmtInput, parseInput } from '../../utils/numformat';
import MerchantMemoryAutocomplete from './MerchantMemoryAutocomplete';

export default function ItemRow({
  row,
  index,
  catalogEntries = [],
  onUpdate,
  onDelete,
  onRemember,
  onEnterLastRow,
  isLastRow = false,
  autoFocus = false,
}) {
  const { lang } = useLang();
  const itemRef = useRef(null);
  const qtyRef = useRef(null);
  const priceRef = useRef(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [swiped, setSwiped] = useState(false);

  useEffect(() => {
    if (autoFocus && itemRef.current) {
      itemRef.current.focus();
    }
  }, [autoFocus]);

  const handleItemKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If autocomplete is showing and an item is highlighted, let it handle Enter
      if (showAutocomplete) return;
      // Otherwise move to qty
      qtyRef.current?.focus();
    } else if (e.key === 'Backspace' && !row.name) {
      // Empty row + backspace = instant delete
      if (isLastRow && index > 0) {
        onDelete(row.id);
      }
    }
  };

  const handleQtyKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      priceRef.current?.focus();
    }
  };

  const handlePriceKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isLastRow) {
        onEnterLastRow();
      } else {
        // Move to next row's item input
        const nextRow = document.querySelector(`[data-row-id="${row.id}"] + [data-row-id] input[data-field="item"]`);
        if (nextRow) nextRow.focus();
      }
    }
  };

  const handleSelect = (entry) => {
    onUpdate(row.id, 'name', entry.name);
    onUpdate(row.id, 'code', entry.code || '');
    onUpdate(row.id, 'catalogEntryId', entry.id);
    onUpdate(row.id, 'itemKind', entry.kind || 'item');
    if (entry.default_price || entry.last_price) {
      onUpdate(row.id, 'price', String(entry.default_price || entry.last_price));
    }
    setShowAutocomplete(false);
    qtyRef.current?.focus();
  };

  const handleRemember = (name) => {
    onRemember(name);
    onUpdate(row.id, 'name', name);
    setShowAutocomplete(false);
    qtyRef.current?.focus();
  };

  // Swipe-to-delete handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.touches[0].clientX;
    if (diff > 60) setSwiped(true);
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    if (!swiped) return;
    setTimeout(() => setSwiped(false), 3000);
  };

  const handleConfirmDelete = () => {
    onDelete(row.id);
    setSwiped(false);
  };

  const lastPrice = row.catalogEntryId
    ? catalogEntries.find(e => e.id === row.catalogEntryId)?.last_price
    : null;

  return (
    <div
      data-row-id={row.id}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe-delete reveal */}
      <div
        className="absolute inset-y-0 right-0 flex items-center"
        style={{ width: '80px', background: '#dc2626' }}
      >
        <button
          type="button"
          onClick={handleConfirmDelete}
          className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
          style={{ minHeight: '44px' }}
        >
          {lang === 'am' ? 'ሰርዝ' : 'Delete'}
        </button>
      </div>

      {/* Main row content */}
      <div
        className="flex gap-2 items-start relative"
        style={{
          transform: swiped ? 'translateX(-80px)' : 'translateX(0)',
          transition: swiped ? 'transform 0.2s ease' : 'none',
          background: '#fff',
        }}
      >
        {/* Item input */}
        <div className="flex-1 min-w-0 relative">
          <input
            ref={itemRef}
            type="text"
            data-field="item"
            value={row.name}
            onChange={(e) => {
              onUpdate(row.id, 'name', e.target.value);
              setShowAutocomplete(e.target.value.trim().length > 0);
            }}
            onKeyDown={handleItemKeyDown}
            onFocus={() => { if (row.name.trim()) setShowAutocomplete(true); }}
            onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
            placeholder={lang === 'am' ? 'ንጥል...' : 'Item...'}
            className="w-full px-2 py-2 border-2 text-sm focus:outline-none"
            style={{
              borderRadius: 'var(--radius-sm)',
              borderColor: row.name ? '#86efac' : '#e8e2d8',
              minHeight: '40px',
            }}
            autoComplete="off"
          />
          {showAutocomplete && (
            <div className="absolute left-0 right-0 top-full z-20">
              <MerchantMemoryAutocomplete
                query={row.name}
                catalogEntries={catalogEntries}
                onSelect={handleSelect}
                onRemember={handleRemember}
              />
            </div>
          )}
          {lastPrice > 0 && !row.price && (
            <span className="text-[10px] absolute -bottom-3 left-0" style={{ color: '#9ca3af' }}>
              {lang === 'am' ? 'Last Sold' : 'Last Sold'}: {fmt(lastPrice)}
            </span>
          )}
        </div>

        {/* Qty input */}
        <div style={{ width: '52px' }}>
          <input
            ref={qtyRef}
            type="text"
            inputMode="numeric"
            data-field="qty"
            value={row.qty}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, '');
              onUpdate(row.id, 'qty', v || '1');
            }}
            onKeyDown={handleQtyKeyDown}
            className="w-full px-1 py-2 border-2 text-sm text-center font-bold focus:outline-none"
            style={{
              borderRadius: 'var(--radius-sm)',
              borderColor: '#e8e2d8',
              minHeight: '40px',
            }}
          />
        </div>

        {/* Price input */}
        <div style={{ width: '72px' }}>
          <input
            ref={priceRef}
            type="text"
            inputMode="decimal"
            data-field="price"
            value={fmtInput(row.price)}
            onChange={(e) => {
              const raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
              onUpdate(row.id, 'price', raw);
            }}
            onKeyDown={handlePriceKeyDown}
            placeholder="0"
            className="w-full px-1 py-2 border-2 text-sm text-right font-bold focus:outline-none"
            style={{
              borderRadius: 'var(--radius-sm)',
              borderColor: row.price ? '#86efac' : '#e8e2d8',
              minHeight: '40px',
            }}
          />
        </div>

        {/* Line total */}
        <div
          className="flex items-center justify-end text-sm font-black flex-shrink-0"
          style={{ width: '68px', minHeight: '40px', color: row.lineTotal > 0 ? '#14532d' : '#d1d5db' }}
        >
          {row.lineTotal > 0 ? fmt(row.lineTotal) : '—'}
        </div>
      </div>
    </div>
  );
}

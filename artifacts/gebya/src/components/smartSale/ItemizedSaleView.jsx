import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Camera, Save, X } from 'lucide-react';
import { useLang } from '../../context/LangContext';
import { db } from '../../db';
import { fmt, fmtInput, parseInput } from '../../utils/numformat';
import { compressPhoto } from '../../utils/photoCapture';
import { buildPhotoFields, createPhotoProof } from '../../utils/photoProof';
import { fireToast } from '../Toast';
import PaymentTypeChips from '../PaymentTypeChips';
import ItemRow from './ItemRow';
import { useSmartSaleRows } from './useSmartSaleRows';
import RecentSalesSheet from './RecentSalesSheet';

const MAX_PHOTOS = 3;

export default function ItemizedSaleView({
  onSave,
  onDone,
  enabledProviders = {},
  catalogEntries = [],
  customers = [],
  actorLabel = '',
}) {
  const { lang, t } = useLang();

  // --- State ---
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [shareAuto, setShareAuto] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [undoData, setUndoData] = useState(null);
  const undoTimerRef = useRef(null);
  const hasUnsavedChanges = useRef(false);

  // --- Rows ---
  const {
    rows,
    updateRow,
    deleteRow,
    undoDelete,
    undoStack,
    clearRows,
    ensureEmptyRow,
    filledRows,
    totalQty,
    totalAmount,
    buildItemsArray,
  } = useSmartSaleRows(3);

  // Track unsaved changes for discard warning
  useEffect(() => {
    hasUnsavedChanges.current = filledRows.length > 0 || photos.length > 0;
  }, [filledRows, photos]);

  // Warn on browser navigation
  useEffect(() => {
    const handler = (e) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // --- Photo handlers ---
  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      fireToast(lang === 'am' ? `ከፍተኛ ${MAX_PHOTOS} ፎቶ` : `Max ${MAX_PHOTOS} photos`, 2500);
      return;
    }
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      const next = await Promise.all(files.map(async (f) => createPhotoProof(await compressPhoto(f))));
      setPhotos(prev => [...prev, ...next.filter(Boolean)].slice(0, MAX_PHOTOS));
    } catch (err) {
      setPhotoError(err.message || 'Photo failed');
    } finally {
      setPhotoLoading(false);
    }
    e.target.value = '';
  };

  const handleRemovePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  // --- Save ---
  const canSave = filledRows.length > 0 && totalAmount > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const items = buildItemsArray();
      const itemNameForSave = items.map(i => i.name).join(', ').substring(0, 200);
      const photoFields = buildPhotoFields(photos);
      const now = Date.now();
      const data = {
        type: 'sale',
        item_name: itemNameForSave,
        catalog_entry_id: items[0]?.catalog_entry_id || null,
        item_kind: items[0]?.item_kind || null,
        quantity: totalQty,
        amount: totalAmount,
        cost_price: 0,
        profit: null,
        is_credit: false,
        customer_id: null,
        customer_name: null,
        customer_phone: null,
        due_date: null,
        payment_type: paymentType === 'cash' ? 'cash' : paymentType,
        payment_provider: paymentType !== 'cash' ? paymentProvider || null : null,
        direction: null,
        ...photoFields,
        items,
        settlement_mode: 'paid',
        cash_received: paymentType === 'cash' ? totalAmount : 0,
        credit_amount: 0,
        entered_total: null,
        items_subtotal: totalAmount,
        amount_basis: 'items',
        created_at: now,
      };

      await onSave(data);

      // UNDO toast
      setUndoData({ createdAt: now });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoData(null), 5000);

      // Reset
      clearRows();
      setPhotos([]);
      setPaymentType('cash');
      setPaymentProvider('');
      hasUnsavedChanges.current = false;

      fireToast(
        shareAuto
          ? (lang === 'am' ? 'ተቀምጧል · ተጋራል' : 'Saved · Shared')
          : (lang === 'am' ? 'ተቀምጧል' : 'Saved'),
        2500,
        null
      );
    } catch (err) {
      fireToast(lang === 'am' ? 'መቀመጫ አልተሳካም — እንደገና ይሞክሩ' : "Couldn't save — retry", 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Clear ---
  const handleClear = () => {
    if (filledRows.length === 0 && photos.length === 0) return;
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    clearRows();
    setPhotos([]);
    setShowClearConfirm(false);
    hasUnsavedChanges.current = false;
  };

  // --- Discard on back ---
  const handleBack = () => {
    if (hasUnsavedChanges.current) {
      setShowDiscardConfirm(true);
    } else {
      onDone();
    }
  };

  const confirmDiscard = () => {
    hasUnsavedChanges.current = false;
    onDone();
  };

  // --- Undo delete ---
  useEffect(() => {
    if (!undoStack) return;
    fireToast(
      lang === 'am' ? 'ተሰርዟል · UNDO' : 'Deleted · UNDO',
      5000,
      () => undoDelete()
    );
  }, [undoStack, lang, undoDelete]);

  // --- Credit state (for future use) ---
  const isCredit = paymentType === 'credit';

  // --- Save button label ---
  const saveLabel = (() => {
    const itemCount = filledRows.length;
    const total = fmt(totalAmount);
    if (itemCount > 0) {
      return `${lang === 'am' ? 'ሽያጭ' : 'Sale'} ${itemCount} ${itemCount === 1 ? (lang === 'am' ? 'ንጥል' : 'item') : (lang === 'am' ? 'ንጥሎች' : 'items')} · ${total} ETB`;
    }
    return `${lang === 'am' ? 'ሽያጭ' : 'Sale'} ${total} ETB`;
  })();

  return (
    <div className="fixed inset-x-0 top-0 bottom-[60px] bg-white z-30 max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div
        className="flex-shrink-0 px-3 sm:px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid #e8e2d8' }}
      >
        <button
          onClick={handleBack}
          aria-label={lang === 'am' ? 'ተመለስ' : 'Back'}
          className="press-scale flex items-center justify-center"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#6b7280' }} />
        </button>
        <div className="text-center min-w-0">
          <h2 className="text-base font-bold" style={{ color: '#16a34a' }}>
            {lang === 'am' ? 'ንጥል ሽያጭ' : 'Itemized Sale'}
          </h2>
          {actorLabel && (
            <p className="text-[11px] font-semibold truncate" style={{ color: '#6b7280', maxWidth: '220px' }}>
              {actorLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <label
            className="cursor-pointer press-scale flex items-center justify-center"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <input type="file" accept="image/*" multiple onChange={handlePhotoCapture} className="hidden" disabled={photoLoading} />
            {photoLoading ? (
              <span className="text-xs">...</span>
            ) : (
              <Camera className="w-5 h-5" style={{ color: photos.length > 0 ? '#16a34a' : '#6b7280' }} />
            )}
          </label>
          <button
            onClick={() => setShowRecentSales(true)}
            className="press-scale flex items-center justify-center"
            style={{ minWidth: '44px', minHeight: '44px' }}
            aria-label={lang === 'am' ? 'የቅርብ ችን' : 'Recent Sales'}
          >
            <span className="text-lg">📋</span>
          </button>
        </div>
      </div>

      {/* Photo indicators */}
      {photos.length > 0 && (
        <div className="flex-shrink-0 px-3 py-1 flex items-center gap-2" style={{ background: '#f0fdf4' }}>
          <span className="text-xs font-bold" style={{ color: '#16a34a' }}>
            📷 {photos.length} {lang === 'am' ? 'ፎቶ' : 'photo'}{photos.length > 1 ? 's' : ''}
          </span>
          {photos.map(p => (
            <button key={p.id} onClick={() => handleRemovePhoto(p.id)} className="text-xs" style={{ color: '#dc2626' }}>
              ✕
            </button>
          ))}
        </div>
      )}
      {photoError && (
        <div className="flex-shrink-0 px-3 py-1" style={{ background: '#fef2f2' }}>
          <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>{photoError}</span>
        </div>
      )}

      {/* Column header */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2 flex gap-2 items-center" style={{ borderBottom: '1px solid #f3f4f6' }}>
        <span className="flex-1 text-[10px] font-black uppercase tracking-wide" style={{ color: '#6b7280' }}>
          {lang === 'am' ? 'ንጥል' : 'Item'}
        </span>
        <span className="text-[10px] font-black uppercase tracking-wide text-center" style={{ color: '#6b7280', width: '52px' }}>
          {lang === 'am' ? 'ብዛት' : 'Qty'}
        </span>
        <span className="text-[10px] font-black uppercase tracking-wide text-right" style={{ color: '#6b7280', width: '72px' }}>
          {lang === 'am' ? 'ዋጋ' : 'Price'}
        </span>
        <span className="text-[10px] font-black uppercase tracking-wide text-right" style={{ color: '#6b7280', width: '68px' }}>
          {lang === 'am' ? 'ጠቅላላ' : 'Total'}
        </span>
      </div>

      {/* Scrollable item grid */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 space-y-1">
        {rows.map((row, idx) => (
          <ItemRow
            key={row.id}
            row={row}
            index={idx}
            catalogEntries={catalogEntries}
            onUpdate={updateRow}
            onDelete={deleteRow}
            onRemember={(name) => {
              // Save to catalog via parent callback
              if (onSave) {
                db.catalog_entries.add({
                  name,
                  kind: 'item',
                  default_price: null,
                  active: true,
                  created_at: Date.now(),
                  updated_at: Date.now(),
                });
              }
            }}
            onEnterLastRow={ensureEmptyRow}
            isLastRow={idx === rows.length - 1}
            autoFocus={idx === 0}
          />
        ))}
      </div>

      {/* Fixed bottom bar */}
      <div className="flex-shrink-0" style={{ borderTop: '1px solid #e8e2d8', background: '#fff' }}>
        {/* Credit fields (when credit selected) */}
        {isCredit && (
          <div className="px-3 sm:px-4 py-2 space-y-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'owes_me', label: lang === 'am' ? 'ሚተልስኝ' : 'They owe me' },
                { id: 'i_owe', label: lang === 'am' ? 'ምተስል' : 'I owe them' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  className="p-2 border-2 text-center text-xs font-bold min-h-[44px] press-scale"
                  style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8', background: '#fff' }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment chips */}
        <div className="px-3 sm:px-4 py-2">
          <PaymentTypeChips
            paymentType={paymentType}
            provider={paymentProvider}
            onTypeChange={(type) => {
              setPaymentType(type);
              if (type === 'cash') setPaymentProvider('');
            }}
            onProviderChange={setPaymentProvider}
            enabledProviders={enabledProviders}
          />
          {paymentType !== 'cash' && paymentType !== 'credit' && (
            <button
              type="button"
              className="mt-1.5 text-[10px] font-bold flex items-center gap-1"
              style={{ color: '#16a34a' }}
            >
              <Camera className="w-3 h-3" />
              {lang === 'am' ? 'የክፍያ ማረጋገጫ ይያዙ' : 'Attach payment confirmation'}
            </button>
          )}
        </div>

        {/* Action row + Save */}
        <div className="px-3 sm:px-4 py-2 flex items-center gap-2" style={{ borderTop: '1px solid #f3f4f6' }}>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold border press-scale"
            style={{ borderColor: '#e8e2d8', borderRadius: 'var(--radius-sm)', color: '#6b7280', minHeight: '44px' }}
          >
            <X className="w-3.5 h-3.5" />
            {lang === 'am' ? 'አጽዳ' : 'Clear'}
          </button>

          <label
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold cursor-pointer select-none"
            style={{ color: shareAuto ? '#16a34a' : '#6b7280' }}
          >
            <input
              type="checkbox"
              checked={shareAuto}
              onChange={(e) => setShareAuto(e.target.checked)}
              className="sr-only"
            />
            <div
              className="relative w-8 h-5 rounded-full transition-colors"
              style={{ background: shareAuto ? '#16a34a' : '#d1d5db' }}
            >
              <div
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: shareAuto ? 'translateX(12px)' : 'translateX(0)' }}
              />
            </div>
            <span>{lang === 'am' ? 'አጋራ' : 'Share'}</span>
          </label>

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 p-3 font-black text-sm flex items-center justify-center gap-2 transition-all press-scale"
            style={{
              background: canSave ? '#16a34a' : '#e5e7eb',
              color: canSave ? '#fff' : '#9ca3af',
              cursor: canSave ? 'pointer' : 'not-allowed',
              borderRadius: 'var(--radius-md)',
              minHeight: '48px',
            }}
          >
            <Save className="w-5 h-5" />
            {saveLabel}
          </button>
        </div>

        <p className="text-[10px] font-semibold text-center pb-2" style={{ color: '#9ca3af' }}>
          {lang === 'am' ? 'በዚህ ስልክ ተቀምጧል · በኊላ ይቀላቅላል' : 'Saved on this phone · Syncs later'}
        </p>
      </div>

      {/* Clear confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-lg">
            <h3 className="text-base font-bold mb-2" style={{ color: '#111827' }}>
              {lang === 'am' ? 'ፎርምን አጽዳ?' : 'Clear Form?'}
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
              {lang === 'am' ? 'የተመዘገቡ ሁሉ ይጠፋሉ' : 'All entered items will be cleared'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 text-sm font-bold border-2 press-scale"
                style={{ borderColor: '#e8e2d8', borderRadius: 'var(--radius-md)', minHeight: '44px' }}
              >
                {lang === 'am' ? 'ሰርዝ' : 'Cancel'}
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 py-2.5 text-sm font-bold text-white press-scale"
                style={{ background: '#dc2626', borderRadius: 'var(--radius-md)', minHeight: '44px' }}
              >
                {lang === 'am' ? 'አጽዳ' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-lg">
            <h3 className="text-base font-bold mb-2" style={{ color: '#111827' }}>
              {lang === 'am' ? 'ችን ይተው?' : 'Discard Sale?'}
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
              {lang === 'am' ? 'ያልተቀመጠ ሁሉ ይጠፋል' : 'Unsaved data will be lost'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 py-2.5 text-sm font-bold border-2 press-scale"
                style={{ borderColor: '#e8e2d8', borderRadius: 'var(--radius-md)', minHeight: '44px' }}
              >
                {lang === 'am' ? 'ቀጥል' : 'Continue Editing'}
              </button>
              <button
                onClick={confirmDiscard}
                className="flex-1 py-2.5 text-sm font-bold text-white press-scale"
                style={{ background: '#dc2626', borderRadius: 'var(--radius-md)', minHeight: '44px' }}
              >
                {lang === 'am' ? 'ተው' : 'Discard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Sales sheet */}
      {showRecentSales && (
        <RecentSalesSheet
          transactions={[]}
          onClose={() => setShowRecentSales(false)}
        />
      )}
    </div>
  );
}

// TransactionForm.jsx — single-screen v4 redesign.
//
// Renders an inline (not-modal) page covering the screen except the bottom nav.
// User can navigate away via the bottom nav at any time — no trap.
//
// Layout (top to bottom):
//   - Header: ← back, colored type label, Clear (expense only)
//   - Scrollable body:
//       credit direction (credit only)
//       recurring quick-fill (expense only)
//       AMOUNT (large, auto-focused)
//       ITEM/NAME (optional for sale+expense, required name for credit) + photo button
//       payment chips (sale+expense) OR phone+due+direction (credit)
//       photo preview if attached
//   - Sticky bottom: solid colored save button per type
//
// Preserves all existing handlers, save data shape, success screen, recurring popup.
// NEW: photo capture (B-009) — base64 stored on transaction record.

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Save,
  Plus,
  Camera,
  ArrowLeft,
} from 'lucide-react';
import { useLang } from '../context/LangContext';
import InlineDatePicker from './InlineDatePicker';
import { getDueDateOptions } from '../utils/ethiopianCalendar';
import { fmt, fmtInput, parseInput } from '../utils/numformat';
import { photoSizeBytes } from '../utils/photoCapture';
import { buildPhotoFields, createPhotoProof, MAX_PROOF_PHOTOS, photoCountLabel } from '../utils/photoProof';
import { fireToast } from './Toast';
import CameraCapture from './CameraCapture';
import PaymentTypeChips from './PaymentTypeChips';
import AddProviderButton from './AddProviderButton';
import PartialPaymentSheet from './PartialPaymentSheet';
import { db } from '../db';

function handleNumericInput(e, setter) {
  let raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = raw.split('.');
  if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
  setter(raw);
}

function TransactionForm({
   type,
   onSave,
   onDone,
   actorLabel,
   enabledProviders,
   recurringExpenses,
   onRecurringChange,
   customers = [],
   onAddCustomerInline,
   onAddProvider,
   initialPaymentType,
   initialPaymentProvider,
   lastPaymentHistory,
 }) {
  const { lang, t } = useLang();

  // ─── Type config (color, header label, icon, save button text) ─────────
  const headerLabel = {
    sale: lang === 'am' ? '+ ሽያጭ' : '+ Sale',
    expense: lang === 'am' ? '− ወጪ' : '− Expense',
    credit: lang === 'am' ? '↻ ዱቤ' : '↻ Credit',
  }[type] || (lang === 'am' ? '+ ሽያጭ' : '+ Sale');

  const accentColor = {
    sale: '#16a34a',
    expense: '#dc2626',
    credit: '#2563eb',
  }[type] || '#16a34a';

  const isCredit = type === 'credit';
  const isExpense = type === 'expense';

  const itemPlaceholder = isCredit
    ? (lang === 'am' ? 'ለምሳሌ አበበ…' : 'e.g. Abebe...')
    : isExpense
      ? (lang === 'am' ? 'ዝርዝሩን ይመዝቡ...' : 'Add details...')
      : (lang === 'am' ? 'ዝርዝሩን ይመዝቡ...' : 'Add details...');

  const itemLabel = isCredit
    ? (lang === 'am' ? 'ስም' : 'NAME')
    : (lang === 'am' ? 'ዕቃ / አገልግሎት (አማራጭ)' : 'Item / Service (Optional)');

  const saveButtonText = isCredit
    ? (lang === 'am' ? 'ዱቤ አስቀምጥ' : 'Save Dubie')
    : isExpense
      ? (lang === 'am' ? 'ወጪ አስቀምጥ' : 'Save Expense')
      : (lang === 'am' ? 'ሽያጭ አስቀምጥ' : 'Save Sale');

  // ─── State ──────────────────────────────────────────────────────────────
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [selectedDue, setSelectedDue] = useState(null);
  const [customDue, setCustomDue] = useState('');
  // Commit P: Ethiopian calendar picker modal for the "Pick a date" path
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentType, setPaymentType] = useState(initialPaymentType || 'cash');
  const [paymentProvider, setPaymentProvider] = useState(initialPaymentProvider || '');
  const [creditDirection, setCreditDirection] = useState('owes_me');
  const [customerMatch, setCustomerMatch] = useState(null);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [popupName, setPopupName] = useState('');
  const [popupAmount, setPopupAmount] = useState('');
  const [popupFreq, setPopupFreq] = useState('monthly');
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [addRecurringHint, setAddRecurringHint] = useState(false);
  const [partialReceived, setPartialReceived] = useState('');
  const amountInputRef = useRef(null);
  const justSavedTimerRef = useRef(null);

  // Clear any pending "Saved ✓" flash timer on unmount to avoid setState-after-unmount.
  useEffect(() => () => { if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current); }, []);

  // ─── Derived ────────────────────────────────────────────────────────────
  const dueDateOptions = getDueDateOptions();
  const sellingPrice = parseFloat(parseInput(amountDisplay || amount)) || 0;

  const phoneValid = !phoneDigits || /^[79]\d{8}$/.test(phoneDigits);
  const phoneEntered = phoneDigits.length > 0;

  const hasDueDate = isCredit
    ? (selectedDue !== null && selectedDue !== undefined && selectedDue !== 'custom')
        || (selectedDue === 'custom' && customDue)
    : true;

  const isCreditSale = paymentType === 'credit';

  const partialReceivedAmount = parseFloat(parseInput(partialReceived)) || 0;
  const hasPartialAmount = partialReceivedAmount > 0 && partialReceivedAmount < sellingPrice;
  const isPartialSale = paymentType === 'partial' || hasPartialAmount;
  const creditAmount = isPartialSale ? Math.max(0, sellingPrice - partialReceivedAmount) : 0;
  const needsCustomerForPartial = isPartialSale && !customerMatch;
  const recentCreditCustomers = useMemo(() =>
    customers
      .filter(c => c.last_activity_at)
      .sort((a, b) => (b.last_activity_at || 0) - (a.last_activity_at || 0))
      .slice(0, 4),
    [customers]
  );

  // Display-only label for the amount hero badge (payment selector lives in the chips row).
  const paymentLabel = paymentType === 'cash'
    ? (lang === 'am' ? 'ጥሬ' : 'Cash')
    : paymentType === 'credit'
      ? (lang === 'am' ? 'ዱቤ' : 'Credit')
      : (paymentProvider || (lang === 'am' ? 'ጥሬ' : 'Cash'));

  const canSave =
     sellingPrice > 0
     && (isCredit ? item.trim() && hasDueDate : true)
     && (!phoneEntered || phoneValid)
     && !isSaving
     && (!isCreditSale || !!customerMatch)
     && (!isPartialSale || (partialReceivedAmount > 0 && partialReceivedAmount < sellingPrice && !!customerMatch));

  const getEffectiveDueDate = () => {
    if (selectedDue === 'custom' && customDue) return new Date(customDue).getTime();
    return selectedDue;
  };

  // ─── Photo handler — max 3 proof photos ─────────────────────────────
  const handleCameraPhoto = async (dataUrl) => {
    if (!dataUrl) return;
    if (photos.length >= MAX_PROOF_PHOTOS) {
      setPhotoError(lang === 'am' ? '3 ፎቶዎች ሙሉ በሙሉ ተያዝዋል' : 'You can attach up to 3 photos');
      return;
    }
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      const proof = createPhotoProof(dataUrl);
      if (proof) {
        setPhotos(prev => [...prev, proof].slice(0, MAX_PROOF_PHOTOS));
      }
    } catch (err) {
      setPhotoError(err.message || 'Photo capture failed');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
    setPhotoError(null);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    const fullPhone = phoneEntered && phoneValid ? '+251' + phoneDigits : null;

    const itemNameForSave = item.trim();
    const cashReceived = !isCredit && !isCreditSale ? sellingPrice : 0;
    const photoFields = buildPhotoFields(photos);
    const data = {
      type,
      item_name: itemNameForSave,
      catalog_entry_id: null,
      item_kind: null,
      quantity: 1,
      amount: sellingPrice,
      cost_price: 0,
      profit: null,
      is_credit: isCredit,
      customer_id: customerMatch?.id || null,
      customer_name: customerMatch?.display_name || customerMatch?.name || (isCredit ? item.trim() : null) || null,
      customer_phone: (isCredit || isCreditSale || isPartialSale) ? fullPhone : null,
      due_date: (isCredit || isCreditSale || isPartialSale) ? getEffectiveDueDate() : null,
      payment_type: isCredit ? null : (isCreditSale ? 'credit' : (isPartialSale ? paymentType : paymentType)),
      payment_provider: (!isCredit && !isCreditSale) ? (paymentType !== 'cash' ? paymentProvider || null : null) : null,
      direction: isCredit ? creditDirection : null,
      ...photoFields,
      items: null,
      sale_settlement_mode: isCreditSale ? 'credit' : (isPartialSale ? 'partial' : 'paid'),
      paid_amount: isCredit ? 0 : (isCreditSale ? 0 : (isPartialSale ? partialReceivedAmount : sellingPrice)),
      remaining_amount: isPartialSale ? creditAmount : 0,
      settlement_due_date: (isCreditSale || isPartialSale) ? getEffectiveDueDate() : null,
      credit_amount: isPartialSale ? creditAmount : (isCreditSale ? sellingPrice : 0),
      settlement_mode: isCreditSale ? 'credit' : (isPartialSale ? 'partial' : 'paid'),
      cash_received: isCreditSale ? 0 : (isPartialSale ? (paymentType === 'cash' ? partialReceivedAmount : 0) : (paymentType === 'cash' ? sellingPrice : 0)),
      entered_total: type === 'sale' && sellingPrice > 0 ? sellingPrice : null,
      items_subtotal: null,
      amount_basis: null,
      created_at: Date.now(),
    };
    try {
      await onSave(data);
      resetFormInternal();
      // Seamless flow: re-enable saving immediately and show a brief "Saved ✓" flash
      // so fast back-to-back entries need no navigation. Ref-held timer is cleared on
      // each new save and on unmount to stay race-safe.
      setIsSaving(false);
      setJustSaved(true);
      if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
      justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 1200);
    } catch (err) {
      setIsSaving(false);
      fireToast(t.saveFailed || 'Could not save. Please try again.', 3500);
    }
  };

  function resetFormInternal() {
    setAmount('');
    setAmountDisplay('');
    setItem('');
    setPhotos([]);
    setCustomerQuery('');
    setCustomerMatch(null);
    setPhoneDigits('');
    setPhoneTouched(false);
    setSelectedDue(null);
    setCustomDue('');
    setPartialReceived('');
    setPaymentType('cash');
    setPaymentProvider('');
    setTimeout(() => { amountInputRef.current?.focus(); }, 50);
  }

  const openAddRecurring = (demoName = '') => { setPopupName(demoName); setPopupAmount(''); setPopupFreq('monthly'); setShowAddRecurring(true); };

  const handleAddAndUse = async () => {
    const amt = parseFloat(parseInput(popupAmount));
    if (!popupName.trim() || !amt) return;
    const newItem = { id: Date.now(), name: popupName.trim(), amount: amt, freq: popupFreq };
    const current = recurringExpenses || [];
    const updated = [...current, newItem];
    await db.settings.put({ key: 'recurring_expenses', value: JSON.stringify(updated) });
    onRecurringChange?.(updated);
    setShowAddRecurring(false);
    setItem(newItem.name); setAmount(String(newItem.amount)); setAmountDisplay(String(newItem.amount));
    setAddRecurringHint(true);
    setTimeout(() => setAddRecurringHint(false), 4000);
  };

  // ═══════════════════ SALE FORM (simplified: amount + optional note/photo + payment) ═══
  if (type === 'sale') {
    const currency = lang === 'am' ? 'ብር' : 'ETB';
    const saleSaveLabel = sellingPrice > 0
      ? (isCreditSale
          ? (lang === 'am' ? `ዱቤ አስቀምጥ · ${fmt(sellingPrice)} ${currency}` : `Save Credit · ${fmt(sellingPrice)} ETB`)
          : (lang === 'am' ? `አስቀምጥ · ${fmt(sellingPrice)} ${currency}` : `Save ${fmt(sellingPrice)} ETB`))
      : (photos.length > 0 ? (lang === 'am' ? 'ለፎቶ ሽያጭ መጠን ያክሉ' : 'Add amount to save photo sale') : (lang === 'am' ? 'አስቀምጥ' : 'Save'));

    return (
      <div className="fixed inset-x-0 top-0 bottom-[60px] bg-white z-30 max-w-md mx-auto flex flex-col" style={{ background: 'var(--color-surface)' }}>
        {/* Header */}
        <div className="flex-shrink-0 px-3 sm:px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #e8e2d8' }}>
          <button onClick={onDone} aria-label={lang === 'am' ? 'ተመለስ' : 'Back'} className="press-scale flex items-center justify-center" style={{ minWidth: '36px', minHeight: '36px', padding: '4px' }}>
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
          </button>
          <div className="text-center min-w-0">
            <h2 className="text-base font-bold" style={{ color: accentColor }}>{headerLabel}</h2>
            {actorLabel && <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--color-text-muted)', maxWidth: '220px' }}>{lang === 'am' ? `በ${actorLabel} እየተመዘገበ` : `Recording as ${actorLabel}`}</p>}
          </div>
          <div style={{ width: '36px' }} />
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 pb-28 space-y-3">
          {/* Total amount hero */}
          <section className="border" style={{ borderColor: '#d8eadf', borderRadius: 'var(--radius-md)', background: '#f7fcf8' }}>
            <div className="px-3 py-2.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold" style={{ color: '#4b6855' }}>{lang === 'am' ? 'ጠቅላላ መጠን' : 'Total amount'}</p>
                <p className="text-2xl font-black leading-tight" style={{ color: sellingPrice > 0 ? 'var(--color-success-text)' : 'var(--color-text-soft)' }}>{fmt(sellingPrice)} ETB</p>
              </div>
              <span className="px-2.5 py-1.5 text-xs font-black border" style={{ borderColor: '#bbd7c5', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', color: 'var(--color-success-text)' }}>{paymentLabel}</span>
            </div>
            <div className="px-3 pb-3">
              <input ref={amountInputRef} type="text" inputMode="decimal" autoFocus value={fmtInput(amount)}
                onChange={event => handleNumericInput(event, setAmount)}
                placeholder="0" className="w-full px-3 py-3 border-2 focus:outline-none text-2xl font-black"
                style={{ borderRadius: 'var(--radius-md)', borderColor: amount ? '#86efac' : '#d7e3da', color: amount ? 'var(--color-success-text)' : 'var(--color-text-soft)' }} />
            </div>
          </section>

          {/* Note (optional) + photo */}
          <section className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ማስታወሻ (አማራጭ)' : 'Note (optional)'}</p>
            <div className="flex gap-2 items-stretch">
              <button type="button" onClick={() => setShowCamera(true)}
                className="press-scale flex items-center justify-center flex-shrink-0"
                style={{ width: 48, minHeight: 48, border: '2px solid #d7e3da', borderRadius: 'var(--radius-md)', background: photos.length > 0 ? 'var(--color-success-bg)' : '#fafaf6' }}
                aria-label={lang === 'am' ? 'ፎቶ አክል' : 'Take or choose photo'}>
                {photoLoading ? <span className="text-xs">...</span> : <Camera className="w-5 h-5" style={{ color: photos.length > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }} />}
              </button>
              <input type="text" value={item} onChange={e => setItem(e.target.value)}
                placeholder={lang === 'am' ? 'ዝርዝሩን ይመዝቡ...' : 'Add details...'}
                className="flex-1 min-w-0 px-3 py-3 border-2 focus:outline-none text-base"
                style={{ borderRadius: 'var(--radius-md)', borderColor: item ? '#86efac' : '#d7e3da' }} />
            </div>
            {photos.length > 0 && (
              <div className="p-2" style={{ background: '#fafaf6', border: '1px solid #e8e2d8', borderRadius: 'var(--radius-sm)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{lang === 'am' ? 'ፎቶ' : 'Proof photos'}</p>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>{photoCountLabel(photos.length, lang)}</p>
                </div>
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {photos.map((entry) => (
                    <div key={entry.id} className="relative flex-shrink-0">
                      <img src={entry.dataUrl} alt="" className="w-14 h-14 object-cover" style={{ borderRadius: 6 }} />
                      <button type="button" onClick={() => handleRemovePhoto(entry.id)} className="press-scale flex items-center justify-center"
                        style={{ position: 'absolute', top: -6, right: -6, minWidth: 28, minHeight: 28, borderRadius: 999, border: '1px solid #e8e2d8', background: 'var(--color-surface)' }}>
                        <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} /></button>
                      <p className="text-[10px] text-center mt-1" style={{ color: 'var(--color-text-soft)' }}>{Math.round(photoSizeBytes(entry.dataUrl) / 1024)} KB</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {photoError && <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>{photoError}</p>}
          </section>

          {/* Payment chips */}
          <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
            <PaymentTypeChips
              paymentType={paymentType}
              provider={paymentProvider}
              onTypeChange={setPaymentType}
              onProviderChange={setPaymentProvider}
              enabledProviders={enabledProviders}
            />
            <AddProviderButton onAddProvider={onAddProvider} />
          </div>

          {/* Credit details — customer, phone, due date (sale on credit).
              Mirrors the expense/credit branch + ItemizedSaleView: the Credit chip
              sets isCreditSale, this block makes canSave reachable, and handleSave
              already persists customer/phone/due as a credit sale. */}
          {isCreditSale && (
            <>
              {/* Customer search + Add button */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ደንበኛ' : 'CUSTOMER'}</label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input type="text" value={customerQuery} onChange={e => { setCustomerQuery(e.target.value); setCustomerMatch(null); }} placeholder={lang === 'am' ? 'ስም ይተይቡ...' : 'Type customer name...'}
                      className="w-full px-2 py-1.5 text-[11px] border font-bold" style={{ borderColor: customerQuery ? 'var(--color-success)' : 'var(--color-border-light)', borderRadius: 'var(--radius-sm)', minHeight: '38px' }} />
                    {customerQuery.trim() && !customerMatch && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border shadow-sm max-h-[160px] overflow-y-auto" style={{ borderColor: 'var(--color-border-light)', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)' }}>
                        {customers.filter(c => { const q = customerQuery.trim().toLowerCase(); return !q || (c.display_name || c.name || '').toLowerCase().includes(q); }).length > 0 ? (
                          <>
                            {customers.filter(c => { const q = customerQuery.trim().toLowerCase(); return !q || (c.display_name || c.name || '').toLowerCase().includes(q); }).slice(0, 6).map(c => (
                              <button key={c.id} type="button" onClick={() => { setCustomerMatch(c); setCustomerQuery(c.display_name || c.name || ''); }}
                                className="w-full px-2.5 py-2 text-left text-[11px] font-bold border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border-light)', minHeight: '40px' }}>
                                <span>{c.display_name || c.name}</span>
                                
                              </button>
                            ))}
                            {onAddCustomerInline && (
                              <button type="button" onClick={async () => { const name = customerQuery.trim(); if (!name) return; const saved = await onAddCustomerInline({ display_name: name }); if (saved?.id) { setCustomerMatch(saved); setCustomerQuery(saved.display_name || saved.name || ''); } }}
                                className="w-full px-2.5 py-2 text-left text-[11px] font-bold border-t border-dashed" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', minHeight: '40px' }}>
                                + {lang === 'am' ? 'እንደ አዲስ ደንበኛ አክል' : 'Add as new customer'}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="px-2.5 py-2.5 text-[11px]" style={{ color: 'var(--color-text-soft)' }}>
                            {lang === 'am' ? 'ደንበኛ አልተገኘም' : 'No customer found'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={async () => { const name = customerQuery.trim(); if (!name) return; if (!onAddCustomerInline) return; const saved = await onAddCustomerInline({ display_name: name }); if (saved?.id) { setCustomerMatch(saved); setCustomerQuery(saved.display_name || saved.name || ''); } }}
                    className="flex-shrink-0 px-3 text-[11px] font-bold border press-scale"
                    style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', minHeight: '38px', background: 'rgba(22,163,74,0.06)' }}>
                    <span className="text-[14px] mr-1">+</span>{lang === 'am' ? 'አክል' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Recent credit customers — quick-select chips */}
              {!customerQuery && !customerMatch && recentCreditCustomers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {recentCreditCustomers.map(c => (
                    <button key={c.id} type="button" onClick={() => { setCustomerMatch(c); setCustomerQuery(c.display_name || c.name || ''); }}
                      className="px-2.5 py-1.5 text-[11px] font-bold border press-scale" style={{ borderColor: 'var(--color-border-light)', borderRadius: 'var(--radius-sm)', minHeight: '34px', background: 'var(--color-surface)' }}>
                      {c.display_name || c.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Customer summary when selected */}
              {customerMatch && (
                <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: 'rgba(22,163,74,0.06)', borderRadius: 'var(--radius-sm)', minHeight: '42px' }}>
                  <span className="text-[13px] font-bold flex-1">{customerMatch.display_name || customerMatch.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    {lang === 'am' ? 'ዱቤ' : 'BAL'} {fmt(customerMatch.balance || 0)}
                  </span>
                  <button type="button" onClick={() => { setCustomerMatch(null); setCustomerQuery(''); }} className="text-[12px] font-bold press-scale px-1" style={{ color: 'var(--color-text-soft)', minHeight: '30px' }}>✕</button>
                </div>
              )}

              {/* Due date — compact chip row */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'am' ? 'መቼ ይከፍላል?' : 'WHEN IS IT DUE?'} <span style={{ color: 'var(--color-text-soft)', fontWeight: 600 }}>({lang === 'am' ? 'አማራጭ' : 'optional'})</span>
                </label>
                <div className="flex gap-2 mb-2">
                  {dueDateOptions.map(opt => {
                    const active = selectedDue === opt.value && !customDue;
                    return (
                      <button key={opt.value} type="button" onClick={() => setSelectedDue(opt.value)}
                        className="press-scale"
                        style={{
                          padding: '8px 12px', minWidth: 70, minHeight: 40,
                          border: `2px solid ${active ? accentColor : 'var(--color-border)'}`,
                          borderRadius: 8,
                          background: active ? accentColor : 'var(--color-bg-white)',
                          color: active ? 'var(--color-bg-white)' : 'var(--color-text)',
                          fontSize: '0.8rem', fontWeight: 700,
                          cursor: 'pointer', flexShrink: 0,
                        }}>
                        {opt.label}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => { setSelectedDue('custom'); setShowDatePicker(true); }}
                    className="press-scale"
                    style={{
                      padding: '8px 12px', minWidth: 70, minHeight: 40,
                      border: `2px solid ${selectedDue === 'custom' && customDue ? accentColor : 'var(--color-border)'}`,
                      borderRadius: 8,
                      background: selectedDue === 'custom' && customDue ? accentColor : 'var(--color-bg-white)',
                      color: selectedDue === 'custom' && customDue ? 'var(--color-bg-white)' : 'var(--color-text)',
                      fontSize: '0.8rem', fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    📅 <span>{lang === 'am' ? 'ምረጥ' : 'Pick'}</span>
                  </button>
                </div>
              </div>

              <InlineDatePicker open={showDatePicker} value={customDue} onChange={(iso) => { setCustomDue(iso); setSelectedDue('custom'); }} onClose={() => setShowDatePicker(false)} lang={lang} />
            </>
          )}

          {/* Partial sale details — amount received, customer, due date */}
          {isPartialSale && (
            <>
              {/* Amount received */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'am' ? 'የተቀበሉት መጠን' : 'Amount Received'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fmtInput(partialReceived)}
                    onChange={e => setPartialReceived(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0"
                    className="w-full p-3 pr-16 border-2 focus:outline-none text-base"
                    style={{ borderRadius: 'var(--radius-md)', borderColor: partialReceivedAmount > 0 && partialReceivedAmount < sellingPrice ? 'var(--color-primary)' : 'var(--color-border)' }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-semibold" style={{ color: 'var(--color-text-soft)' }}>
                    {lang === 'am' ? 'ብር' : 'birr'}
                  </span>
                </div>
                {partialReceivedAmount > 0 && partialReceivedAmount < sellingPrice && (
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-accent-amber)' }}>
                    {lang === 'am' ? 'ቀሪ ዱቤ' : 'Credit owed'}: {fmt(creditAmount)} {lang === 'am' ? 'ብር' : 'birr'}
                  </p>
                )}
                {partialReceivedAmount >= sellingPrice && sellingPrice > 0 && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-danger)' }}>
                    {lang === 'am' ? 'የተቀበሉት ሙሉ ነው — "ሙሉ" ይምረጡ' : 'Amount received is the full sale — use "Paid" instead.'}
                  </p>
                )}
                {isPartialSale && partialReceivedAmount > 0 && paymentType !== 'cash' && (
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-success-text)' }}>
                    → {fmt(partialReceivedAmount)} {lang === 'am' ? 'ብር' : 'ETB'} {lang === 'am' ? 'በ' : 'via'} {paymentProvider || paymentType}
                  </p>
                )}
              </div>

              {/* Customer search + Add button */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ደንበኛ' : 'CUSTOMER'}</label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input type="text" value={customerQuery} onChange={e => { setCustomerQuery(e.target.value); setCustomerMatch(null); }} placeholder={lang === 'am' ? 'ስም ይተይቡ...' : 'Type customer name...'}
                      className="w-full px-2 py-1.5 text-[11px] border font-bold" style={{ borderColor: customerQuery ? 'var(--color-success)' : 'var(--color-border-light)', borderRadius: 'var(--radius-sm)', minHeight: '38px' }} />
                    {customerQuery.trim() && !customerMatch && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border shadow-sm max-h-[160px] overflow-y-auto" style={{ borderColor: 'var(--color-border-light)', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)' }}>
                        {customers.filter(c => { const q = customerQuery.trim().toLowerCase(); return !q || (c.display_name || c.name || '').toLowerCase().includes(q); }).length > 0 ? (
                          <>
                            {customers.filter(c => { const q = customerQuery.trim().toLowerCase(); return !q || (c.display_name || c.name || '').toLowerCase().includes(q); }).slice(0, 6).map(c => (
                              <button key={c.id} type="button" onClick={() => { setCustomerMatch(c); setCustomerQuery(c.display_name || c.name || ''); }}
                                className="w-full px-2.5 py-2 text-left text-[11px] font-bold border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border-light)', minHeight: '40px' }}>
                                <span>{c.display_name || c.name}</span>
                                
                              </button>
                            ))}
                            {onAddCustomerInline && (
                              <button type="button" onClick={async () => { const name = customerQuery.trim(); if (!name) return; const saved = await onAddCustomerInline({ display_name: name }); if (saved?.id) { setCustomerMatch(saved); setCustomerQuery(saved.display_name || saved.name || ''); } }}
                                className="w-full px-2.5 py-2 text-left text-[11px] font-bold border-t border-dashed" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', minHeight: '40px' }}>
                                + {lang === 'am' ? 'እንደ አዲስ ደንበኛ አክል' : 'Add as new customer'}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="px-2.5 py-2.5 text-[11px]" style={{ color: 'var(--color-text-soft)' }}>
                            {lang === 'am' ? 'ደንበኛ አልተገኘም' : 'No customer found'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={async () => { const name = customerQuery.trim(); if (!name) return; if (!onAddCustomerInline) return; const saved = await onAddCustomerInline({ display_name: name }); if (saved?.id) { setCustomerMatch(saved); setCustomerQuery(saved.display_name || saved.name || ''); } }}
                    className="flex-shrink-0 px-3 text-[11px] font-bold border press-scale"
                    style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', minHeight: '38px', background: 'rgba(22,163,74,0.06)' }}>
                    <span className="text-[14px] mr-1">+</span>{lang === 'am' ? 'አክል' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Recent credit customers — quick-select chips */}
              {!customerQuery && !customerMatch && recentCreditCustomers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {recentCreditCustomers.map(c => (
                    <button key={c.id} type="button" onClick={() => { setCustomerMatch(c); setCustomerQuery(c.display_name || c.name || ''); }}
                      className="px-2.5 py-1.5 text-[11px] font-bold border press-scale" style={{ borderColor: 'var(--color-border-light)', borderRadius: 'var(--radius-sm)', minHeight: '34px', background: 'var(--color-surface)' }}>
                      {c.display_name || c.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Customer summary when selected */}
              {customerMatch && (
                <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: 'rgba(22,163,74,0.06)', borderRadius: 'var(--radius-sm)', minHeight: '42px' }}>
                  <span className="text-[13px] font-bold flex-1">{customerMatch.display_name || customerMatch.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    {lang === 'am' ? 'ዱቤ' : 'BAL'} {fmt(customerMatch.balance || 0)}
                  </span>
                  <button type="button" onClick={() => { setCustomerMatch(null); setCustomerQuery(''); }} className="text-[12px] font-bold press-scale px-1" style={{ color: 'var(--color-text-soft)', minHeight: '30px' }}>✕</button>
                </div>
              )}

              {/* Due date — compact chip row */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'am' ? 'የቀሪው መክፈያ ቀን' : 'REMAINING DUE DATE'} <span style={{ color: 'var(--color-text-soft)', fontWeight: 600 }}>({lang === 'am' ? 'አማራጭ' : 'optional'})</span>
                </label>
                <div className="flex gap-2 mb-2">
                  {dueDateOptions.map(opt => {
                    const active = selectedDue === opt.value && !customDue;
                    return (
                      <button key={opt.value} type="button" onClick={() => setSelectedDue(opt.value)}
                        className="press-scale"
                        style={{
                          padding: '8px 12px', minWidth: 70, minHeight: 40,
                          border: `2px solid ${active ? accentColor : 'var(--color-border)'}`,
                          borderRadius: 8,
                          background: active ? accentColor : 'var(--color-bg-white)',
                          color: active ? 'var(--color-bg-white)' : 'var(--color-text)',
                          fontSize: '0.8rem', fontWeight: 700,
                          cursor: 'pointer', flexShrink: 0,
                        }}>
                        {opt.label}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => { setSelectedDue('custom'); setShowDatePicker(true); }}
                    className="press-scale"
                    style={{
                      padding: '8px 12px', minWidth: 70, minHeight: 40,
                      border: `2px solid ${selectedDue === 'custom' && customDue ? accentColor : 'var(--color-border)'}`,
                      borderRadius: 8,
                      background: selectedDue === 'custom' && customDue ? accentColor : 'var(--color-bg-white)',
                      color: selectedDue === 'custom' && customDue ? 'var(--color-bg-white)' : 'var(--color-text)',
                      fontSize: '0.8rem', fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    📅 <span>{lang === 'am' ? 'ምረጥ' : 'Pick'}</span>
                  </button>
                </div>
              </div>

              <InlineDatePicker open={showDatePicker} value={customDue} onChange={(iso) => { setCustomDue(iso); setSelectedDue('custom'); }} onClose={() => setShowDatePicker(false)} lang={lang} />
            </>
          )}
        </div>

        {/* Save button */}
        <div className="flex-shrink-0 px-3 sm:px-4 py-3" style={{ borderTop: '1px solid #e8e2d8', background: 'var(--color-surface)' }}>
          {!canSave && sellingPrice > 0 && isCreditSale && <p className="text-xs font-semibold text-center mb-2" style={{ color: 'var(--color-warning)' }}>{lang === 'am' ? 'ከላይ ደንበኛ ይምረጡ ወይም ያክሉ' : 'Add or pick a customer above'}</p>}
          <button type="button" onClick={handleSave} disabled={!canSave} className="w-full p-3 font-black text-base flex items-center justify-center gap-2 transition-all press-scale"
            style={{ background: (justSaved && !canSave) ? 'var(--color-success)' : (canSave ? 'var(--color-success-text)' : 'var(--color-bg-disabled)'), color: ((justSaved && !canSave) || canSave) ? 'var(--color-bg-white)' : 'var(--color-text-soft)', cursor: canSave ? 'pointer' : 'default', borderRadius: 'var(--radius-md)' }}>
            {(justSaved && !canSave)
              ? <><Check className="w-5 h-5" />{lang === 'am' ? 'ተቀምጧል' : 'Saved'}</>
              : <><Save className="w-5 h-5" />{saleSaveLabel}</>}</button>
          <p className="text-[11px] font-semibold text-center mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'በዚህ ስልክ ተቀምጧል · በኋላ ይመሳሰላል' : 'Saved on this phone · Syncs later'}</p>
        </div>

        {/* Camera capture modal (was missing from the sale branch) */}
        <CameraCapture
          open={showCamera}
          onCapture={(dataUrl) => { handleCameraPhoto(dataUrl); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
          lang={lang}
        />
      </div>
    );
  }

  // ═══════════════════ EXPENSE / CREDIT FORM ══════════════════════
  return (
    <div className="fixed inset-x-0 top-0 bottom-[60px] bg-white z-30 max-w-md mx-auto flex flex-col" style={{ background: 'var(--color-surface)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #e8e2d8' }}>
        <button onClick={onDone} aria-label={lang === 'am' ? 'ተመለስ' : 'Back'} className="press-scale flex items-center justify-center" style={{ minWidth: '36px', minHeight: '36px', padding: '4px' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
        </button>
        <h2 className="text-base font-bold" style={{ color: accentColor }}>{headerLabel}</h2>
        {isExpense ? (
          <button onClick={resetFormInternal} className="text-xs font-bold press-scale px-2 py-1" style={{ color: 'var(--color-text-soft)', minWidth: '36px', textAlign: 'right' }}>
            {lang === 'am' ? 'አጽዳ' : 'Clear'}
          </button>
        ) : actorLabel ? (
          <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--color-warning)', maxWidth: '100px', textAlign: 'right' }} title={actorLabel}>{actorLabel}</span>
        ) : <div style={{ width: '36px' }} />}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 pb-2 space-y-4">
        {isCredit && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'አቅጣጫ' : 'DIRECTION'}</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ id: 'owes_me', label: lang === 'am' ? 'ያበደርኩት' : 'They owe me' }, { id: 'i_owe', label: lang === 'am' ? 'የተበደርኩት' : 'I owe them' }].map(d => (
                <button key={d.id} type="button" onClick={() => setCreditDirection(d.id)} className="p-3 border-2 text-center transition-all min-h-[48px] press-scale text-sm font-bold"
                  style={{ borderRadius: 'var(--radius-md)', borderColor: creditDirection === d.id ? accentColor : 'var(--color-border)', background: creditDirection === d.id ? `${accentColor}10` : 'var(--color-bg-white)', color: creditDirection === d.id ? accentColor : 'var(--color-text-muted)' }}>{d.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Recurring quick-fill (expense only) */}
        {isExpense && recurringExpenses && recurringExpenses.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ፈጣን ሙላ' : 'QUICK-FILL'}</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {recurringExpenses.map(re => (
                <button key={re.id} type="button" onClick={() => { setItem(re.name); setAmount(String(re.amount)); setAmountDisplay(String(re.amount)); }} className="flex-shrink-0 px-3 py-1.5 border text-xs font-bold press-scale"
                  style={{ borderRadius: 'var(--radius-sm)', borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-primary)' }}>
                  <div>{re.name}</div><div className="font-normal text-[10px]" style={{ color: 'var(--color-accent-amber)' }}>{fmt(re.amount)} {lang === 'am' ? 'ብር' : 'birr'}</div></button>
              ))}
              <button type="button" onClick={() => openAddRecurring('')} className="flex-shrink-0 px-3 py-1.5 border text-xs font-bold press-scale flex items-center justify-center"
                style={{ borderRadius: 'var(--radius-sm)', borderColor: '#c9bfa8', borderStyle: 'dashed', background: 'var(--color-surface-subtle)', color: 'var(--color-text-soft)', minWidth: '40px' }}><Plus className="w-4 h-4" /></button>
            </div>
            {addRecurringHint && <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-accent-amber)' }}>{lang === 'am' ? 'በቅንብሮች ውስጥ ሌሎች ተደጋጋሚ ወጪዎችን ማከል ይችላሉ' : 'You can add more recurring expenses in Settings'}</p>}
          </div>
        )}
        {isExpense && (!recurringExpenses || recurringExpenses.length === 0) && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ፈጣን ሙላ' : 'QUICK-FILL (EXAMPLES)'}</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[lang === 'am' ? 'ኪራይ' : 'Rent', lang === 'am' ? 'እቁብ' : 'እቁብ'].map(demoName => (
                <button key={demoName} type="button" onClick={() => openAddRecurring(demoName)} className="flex-shrink-0 px-3 py-1.5 border text-xs font-bold press-scale"
                  style={{ borderRadius: 'var(--radius-sm)', borderColor: '#c9bfa8', borderStyle: 'dashed', background: 'var(--color-surface-subtle)', color: 'var(--color-text-soft)' }}>{demoName}</button>
              ))}
              <button type="button" onClick={() => openAddRecurring('')} className="flex-shrink-0 px-3 py-1.5 border text-xs font-bold press-scale flex items-center justify-center"
                style={{ borderRadius: 'var(--radius-sm)', borderColor: '#c9bfa8', borderStyle: 'dashed', background: 'var(--color-surface-subtle)', color: 'var(--color-text-soft)', minWidth: '40px' }}><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* AMOUNT */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'መጠን' : 'AMOUNT'}</label>
          <div className="relative">
            <input ref={amountInputRef} type="text" inputMode="decimal" value={fmtInput(amountDisplay || amount)}
              onChange={e => { let raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, ''); const parts = raw.split('.'); if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join(''); setAmountDisplay(raw); setAmount(raw); }}
              placeholder="0"
              className="w-full py-3 pr-20 text-3xl sm:text-4xl font-bold text-center focus:outline-none"
              style={{ borderBottom: `2px solid ${amountDisplay ? accentColor : 'var(--color-border)'}`, background: 'transparent', color: amountDisplay ? accentColor : 'var(--color-text-soft)' }} />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-base sm:text-lg font-semibold" style={{ color: 'var(--color-text-soft)' }}>{lang === 'am' ? 'ብር' : 'birr'}</span>
          </div>

        </div>

        {/* ITEM / NAME + photo button */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{itemLabel}</label>
          <div className="flex gap-2 items-stretch">
            <input type="text" value={item} onChange={e => setItem(e.target.value)} placeholder={itemPlaceholder}
              className="flex-1 min-w-0 p-3 border-2 focus:outline-none text-base" style={{ borderRadius: 'var(--radius-md)', borderColor: 'var(--color-border)' }} />
            {!isCredit && (
              <button type="button" onClick={() => setShowCamera(true)}
                aria-label={lang === 'am' ? 'ፎቶ አክል' : 'Take or choose photo'}
                className="cursor-pointer press-scale flex items-center justify-center flex-shrink-0"
                style={{ width: '56px', border: '2px solid #e8e2d8', borderRadius: 'var(--radius-md)', background: photos.length > 0 ? 'var(--color-success-bg)' : '#fafaf6', position: 'relative' }}>
                {photoLoading ? <span className="text-sm">...</span> : <Camera className="w-6 h-6" style={{ color: photos.length > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }} />}
                <span aria-hidden="true" style={{ position: 'absolute', top: -7, right: -7, minWidth: 24, height: 20, padding: '0 5px', borderRadius: 999, background: 'var(--color-success)', color: 'var(--color-bg-white)', border: '2px solid #fff', fontSize: 10, fontWeight: 900, lineHeight: '16px', textAlign: 'center' }}>+</span>
              </button>
            )}
          </div>
          {photos.length > 0 && (
            <div className="mt-2 p-2" style={{ background: '#fafaf6', border: '1px solid #e8e2d8', borderRadius: 'var(--radius-sm)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{lang === 'am' ? 'ፎቶ' : 'Proof photos'}</p>
                <p className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>{photoCountLabel(photos.length, lang)}</p>
              </div>
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {photos.map((entry, index) => (
                  <div key={entry.id} className="relative flex-shrink-0">
                    <img src={entry.dataUrl} alt="" className="w-14 h-14 object-cover" style={{ borderRadius: 6 }} />
                    <button type="button" onClick={() => handleRemovePhoto(entry.id)} className="press-scale flex items-center justify-center"
                      style={{ position: 'absolute', top: -6, right: -6, minWidth: 28, minHeight: 28, borderRadius: 999, border: '1px solid #e8e2d8', background: 'var(--color-surface)' }}>
                      <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} /></button>
                    <p className="text-[10px] text-center mt-1" style={{ color: 'var(--color-text-soft)' }}>{Math.round(photoSizeBytes(entry.dataUrl) / 1024)} KB</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment chips (expense only) — lets us track which account we paid from */}
        {isExpense && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'am' ? 'የክፍያ ዘዴ' : 'Payment Method'}
            </label>
            <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
              <PaymentTypeChips
                paymentType={paymentType}
                provider={paymentProvider}
                onTypeChange={setPaymentType}
                onProviderChange={setPaymentProvider}
                enabledProviders={enabledProviders}
              />
              <AddProviderButton onAddProvider={onAddProvider} />
            </div>
          </div>
        )}

        {/* Customer */}
        {(isCredit || isCreditSale) && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ደንበኛ' : 'CUSTOMER'}</label>
            <div className="relative">
              <input type="text" value={customerQuery} onChange={e => { setCustomerQuery(e.target.value); setCustomerMatch(null); }} placeholder={lang === 'am' ? 'ስም ይተይቡ...' : 'Type customer name...'}
                className="w-full p-3 border-2 focus:outline-none text-base" style={{ borderRadius: 'var(--radius-md)', borderColor: customerQuery ? '#86efac' : 'var(--color-border)' }} />
              {customerQuery.trim() && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border shadow-lg" style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', maxHeight: '160px', overflowY: 'auto' }}>
                  {customers.filter(c => { const q = customerQuery.trim().toLowerCase(); return !q || (c.display_name || c.name || '').toLowerCase().includes(q); }).slice(0, 6).map(c => (
                    <button key={c.id} type="button" onClick={() => { setCustomerMatch(c); setCustomerQuery(c.display_name || c.name || ''); }}
                      className="w-full px-3 py-2.5 text-left border-b press-scale flex items-center justify-between gap-2" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface)' }}>
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{c.display_name || c.name}</span>
                      {c.balance > 0 && <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--color-accent-amber)' }}>{fmt(c.balance)} {lang === 'am' ? 'ብር' : 'ETB'}</span>}
                    </button>
                  ))}
                  {onAddCustomerInline && customers.filter(c => { const q = customerQuery.trim().toLowerCase(); return !q || (c.display_name || c.name || '').toLowerCase().includes(q); }).length === 0 && (
                    <button type="button" onClick={async () => { const name = customerQuery.trim(); if (!name) return; const saved = await onAddCustomerInline({ display_name: name }); if (saved?.id) { setCustomerMatch(saved); setCustomerQuery(saved.display_name || saved.name || ''); } }}
                      className="w-full px-3 py-2.5 text-left text-sm font-bold press-scale flex items-center gap-2" style={{ background: '#f7fcf8', color: 'var(--color-success-text)' }}>
                      <Plus className="w-4 h-4" /> {lang === 'am' ? 'አዲስ ደንበኛ ይመልከቱ' : 'Add new customer'}: <span className="truncate" style={{ color: 'var(--color-primary)' }}>{customerQuery.trim()}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phone */}
        {(isCredit || isCreditSale) && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ስልክ (አማራጭ)' : 'PHONE (OPTIONAL)'}</label>
            <div className="flex gap-0">
              <div className="flex items-center justify-center px-3 py-3 border-2 border-r-0 text-sm font-bold flex-shrink-0"
                style={{ background: 'rgba(27,67,50,0.06)', borderColor: (phoneTouched && phoneEntered && !phoneValid) ? 'var(--color-danger)' : 'var(--color-border)', color: 'var(--color-primary)', minWidth: '60px', borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)' }}>+251</div>
              <input type="tel" inputMode="numeric" value={phoneDigits} onChange={e => { const raw = e.target.value.replace(/\D/g, ''); if (raw.length <= 9) setPhoneDigits(raw); }}
                onBlur={() => setPhoneTouched(true)}
                placeholder="9XXXXXXXX" maxLength={9} className="flex-1 p-3 border-2 text-base focus:outline-none"
                style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', borderColor: (phoneTouched && phoneEntered && !phoneValid) ? 'var(--color-danger)' : (phoneEntered && phoneValid ? 'var(--color-primary)' : 'var(--color-border)') }} />
            </div>
          </div>
        )}

        {/* Due date */}
        {(isCredit || isCreditSale) && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'መቼ ይከፍላል?' : 'WHEN IS IT DUE?'} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <div className="flex gap-2 mb-2">
              {dueDateOptions.map(opt => {
                const active = selectedDue === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setSelectedDue(opt.value)} className="press-scale"
                    style={{
                      padding: '8px 12px', minWidth: 70, minHeight: 40,
                      border: `2px solid ${active ? accentColor : 'var(--color-border)'}`,
                      borderRadius: 8,
                      background: active ? accentColor : 'var(--color-bg-white)',
                      color: active ? 'var(--color-bg-white)' : 'var(--color-text)',
                      fontSize: '0.8rem', fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0,
                    }}>
                    {opt.label}
                  </button>
                );
              })}
              <button type="button" onClick={() => { setSelectedDue('custom'); setShowDatePicker(true); }} className="press-scale"
                style={{
                  padding: '8px 12px', minWidth: 70, minHeight: 40,
                  border: `2px solid ${selectedDue === 'custom' ? accentColor : 'var(--color-border)'}`,
                  borderRadius: 8,
                  background: selectedDue === 'custom' ? accentColor : 'var(--color-bg-white)',
                  color: selectedDue === 'custom' ? 'var(--color-bg-white)' : 'var(--color-text)',
                  fontSize: '0.8rem', fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                📅 <span>{lang === 'am' ? 'ምረጥ' : 'Pick'}</span>
              </button>
            </div>
            {!hasDueDate && <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-accent-amber)' }}>{lang === 'am' ? 'የመክፍያ ቀን ይምረጡ' : 'Please select a due date'}</p>}
          </div>
        )}

        <InlineDatePicker open={showDatePicker} value={customDue} onChange={(iso) => { setCustomDue(iso); setSelectedDue('custom'); }} onClose={() => setShowDatePicker(false)} lang={lang} />


      </div>

      {/* Save button */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-3" style={{ borderTop: '1px solid #e8e2d8' }}>
        {!canSave && sellingPrice > 0 && (() => {
          let blocker = null;
          if (isCredit && !item.trim()) blocker = lang === 'am' ? '↑ ስም ይተይቡ' : '↑ Enter customer name';
          else if (isCredit && !hasDueDate) blocker = lang === 'am' ? '↑ የመክፈያ ቀን ይምረጡ' : '↑ Pick due date';
          else if (phoneEntered && !phoneValid) blocker = lang === 'am' ? '↑ ስልክ ስህተት' : '↑ Phone format invalid';
          if (!blocker) return null;
          return <p style={{ fontSize: '0.78rem', color: 'var(--color-warning)', background: 'var(--color-warning-bg)', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', marginBottom: 8, fontWeight: 600, textAlign: 'center' }}>{blocker}</p>;
        })()}
        <button onClick={handleSave} disabled={!canSave} className="w-full p-3 font-bold text-white text-base flex items-center justify-center gap-2 transition-all press-scale"
          style={{ background: (justSaved && !canSave) ? 'var(--color-success)' : (canSave ? accentColor : 'var(--color-bg-disabled)'), color: ((justSaved && !canSave) || canSave) ? 'var(--color-bg-white)' : 'var(--color-text-soft)', cursor: canSave ? 'pointer' : 'default', borderRadius: 'var(--radius-md)' }}>
          {(justSaved && !canSave)
            ? <><Check className="w-5 h-5" />{lang === 'am' ? 'ተቀምጧል' : 'Saved'}</>
            : <><Save className="w-5 h-5" />{saveButtonText}</>}</button>
      </div>

      {/* Recurring popup */}
      {showAddRecurring && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 60, background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white w-full max-w-md p-5 sm:p-6" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{lang === 'am' ? 'ተደጋጋሚ ወጪ አክል' : 'Add recurring expense'}</h3>
              <button onClick={() => setShowAddRecurring(false)} className="press-scale flex items-center justify-center" style={{ minWidth: '36px', minHeight: '36px' }}><X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ይህን ወጪ ለሚቀጥሉ ጊዜያት አስቀምጥ' : 'Save this as a recurring expense to reuse it anytime'}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{lang === 'am' ? 'ምን ላይ ወጪ?' : 'What did you spend on?'}</label>
                <input type="text" value={popupName} onChange={e => setPopupName(e.target.value)} placeholder={lang === 'am' ? 'ዝርዝሩን ይመዝቡ...' : 'Add details...'}
                  className="w-full p-2.5 border-2 focus:outline-none text-sm" style={{ borderRadius: 'var(--radius-md)', borderColor: 'var(--color-border)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{lang === 'am' ? 'ጠቅላላ ስንት?' : 'How much total?'}</label>
                <div className="relative">
                  <input type="text" inputMode="decimal" value={fmtInput(popupAmount)} onChange={e => handleNumericInput(e, setPopupAmount)} placeholder="0"
                    className="w-full p-2.5 pr-12 border-2 focus:outline-none text-sm" style={{ borderRadius: 'var(--radius-md)', borderColor: 'var(--color-border)' }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-text-soft)' }}>{lang === 'am' ? 'ብር' : 'birr'}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{lang === 'am' ? 'ድግግሞሽ' : 'Frequency'}</label>
                <div className="flex gap-2">
                  {[{ id: 'daily', label: lang === 'am' ? 'ዕለታዊ' : 'Daily' }, { id: 'weekly', label: lang === 'am' ? 'ሳምንታዊ' : 'Weekly' }, { id: 'monthly', label: lang === 'am' ? 'ወርሃዊ' : 'Monthly' }].map(f => (
                    <button key={f.id} type="button" onClick={() => setPopupFreq(f.id)} className="flex-1 py-2 text-xs font-bold border-2 press-scale"
                      style={{ borderRadius: 'var(--radius-sm)', borderColor: popupFreq === f.id ? 'var(--color-danger)' : 'var(--color-border)', background: popupFreq === f.id ? 'rgba(220,38,38,0.08)' : 'var(--color-bg-white)', color: popupFreq === f.id ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{f.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddAndUse} disabled={!popupName.trim() || !parseFloat(parseInput(popupAmount))} className="w-full mt-4 p-3 font-bold text-base flex items-center justify-center gap-2 press-scale"
              style={{ borderRadius: 'var(--radius-md)', background: (popupName.trim() && parseFloat(parseInput(popupAmount))) ? 'var(--color-danger)' : 'var(--color-bg-disabled)', color: (popupName.trim() && parseFloat(parseInput(popupAmount))) ? 'var(--color-bg-white)' : 'var(--color-text-soft)' }}>
              <Plus className="w-5 h-5" />{lang === 'am' ? 'አስቀምጥ እና ተጠቀም' : 'Add & Use'}</button>
          </div>
        </div>
      )}

      {/* Camera capture modal */}
      <CameraCapture
        open={showCamera}
        onCapture={(dataUrl) => { handleCameraPhoto(dataUrl); setShowCamera(false); }}
        onClose={() => setShowCamera(false)}
        lang={lang}
      />
    </div>
  );
}

export default TransactionForm;

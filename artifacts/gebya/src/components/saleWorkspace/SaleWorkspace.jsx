// SaleWorkspace.jsx — Unified sale capture (v1).
//
// ONE state machine, TWO presentations (variant prop):
//   variant="fullscreen" — fixed overlay opened from the action bar.
//                          Replaces ItemizedSaleView after regression.
//   variant="inline"     — always-present capture strip inside TodayTab.
//                          Zero-tap simple sales; grows in place.
//
// Stages (merchant advances by ACTING, never by choosing a mode):
//   SIMPLE   — amount + context (writes item_name) + payment chips.
//   ITEMIZED — entered amount becomes row 1 (qty 1); total = Σ lines − discount.
//   ADVANCED — credit/partial blocks revealed by the payment chips; nothing
//              hides after reveal; collapsing details never deletes data.
//
// Post-save (per spec §15/§16): stays open, resets transaction-specific state,
// 1.2s "Saved ✓" button flash + 4s UNDO toast (soft-delete via
// onDeleteTransaction). No onDone() eject — the merchant records the next
// sale without a round-trip to the home screen.
//
// Reused unchanged from the legacy screens: useSmartSaleRows, ItemRow,
// MerchantMemoryAutocomplete, RecentSalesSheet, PaymentTypeChips,
// AddProviderButton, InlineDatePicker, CameraCapture, draft persistence.
// Expense and standalone-credit forms are NOT touched by this component.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowLeft, Camera, Save, Check } from 'lucide-react';
import { useLang } from '../../context/LangContext';
import { db } from '../../db';
import { fmt, fmtInput, parseInput } from '../../utils/numformat';
import { buildPhotoFields, createPhotoProof, MAX_PROOF_PHOTOS } from '../../utils/photoProof';
import { photoSizeBytes } from '../../utils/photoCapture';
import CameraCapture from '../CameraCapture';
import { fireToast } from '../Toast';
import PaymentTypeChips from '../PaymentTypeChips';
import AddProviderButton from '../AddProviderButton';
import ItemRow from '../smartSale/ItemRow';
import { useSmartSaleRows } from '../smartSale/useSmartSaleRows';
import RecentSalesSheet from '../smartSale/RecentSalesSheet';
import MerchantMemoryAutocomplete from '../smartSale/MerchantMemoryAutocomplete';
import { getDueDateOptions } from '../../utils/ethiopianCalendar';
import InlineDatePicker from '../InlineDatePicker';
import { normalizeEthiopianPhone } from '../../utils/phoneNumber';
import { MAX_PHOTOS, DRAFT_KEY, STRIP_DRAFT_KEY, loadDraft, saveDraft, clearDraft } from '../smartSale/itemizedSaleHelpers';
import { usePermissionsStore } from '../../stores/permissionsStore';
import Portal from './Portal';

export default function SaleWorkspace({
  variant = 'fullscreen',          // 'fullscreen' | 'inline'
  onSave,
  onDone,                          // fullscreen close (inline ignores)
  onDeleteTransaction,             // soft-delete — powers the post-save UNDO
  enabledProviders = {},
  catalogEntries = [],
  customers = [],
  onSaveCatalogEntry,
  onAddCustomerInline,
  onAddProvider,
  transactions = [],
  actorLabel = '',
  onHistory,
  onViewTransaction,
  shopProfile = {},
  initialPaymentType,
  initialPaymentProvider,
}) {
  const { lang, t } = useLang();
  const isInline = variant === 'inline';
  const canAddRecords = usePermissionsStore(s => s.hasPermission('can_add_records'));

  // Per-variant draft key: the strip and the full-screen workspace never
  // clobber each other's in-progress sale.
  const draftKey = isInline ? STRIP_DRAFT_KEY : DRAFT_KEY;
  const draft = loadDraft(draftKey);

  // ─── Stage: SIMPLE → ITEMIZED (sticky once itemized until save/discard) ──
  const [stage, setStage] = useState(draft?.stage === 'itemized' ? 'itemized' : 'simple');

  // ─── SIMPLE state ───
  const [amount, setAmount] = useState(draft?.amount || '');
  const [context, setContext] = useState(draft?.context || '');
  const [selectedCatalogEntryId, setSelectedCatalogEntryId] = useState(null);
  const [selectedCatalogKind, setSelectedCatalogKind] = useState(null);
  const [showContextAc, setShowContextAc] = useState(false);
  const amountInputRef = useRef(null);

  // ─── Payment / credit / partial state (shared with both old forms) ───
  const [paymentType, setPaymentType] = useState(draft?.paymentType || initialPaymentType || 'cash');
  const [paymentProvider, setPaymentProvider] = useState(draft?.paymentProvider || initialPaymentProvider || '');
  const [partialReceived, setPartialReceived] = useState(draft?.partialReceived || '');
  const [creditCustomerSearch, setCreditCustomerSearch] = useState('');
  const [creditCustomerId, setCreditCustomerId] = useState(null);
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [creditCustomerPhone, setCreditCustomerPhone] = useState('');
  const [selectedDueTs, setSelectedDueTs] = useState(null);
  const [customDueIso, setCustomDueIso] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ─── Proof photos (camera-only, max 3) ───
  const [photos, setPhotos] = useState(draft?.photos || []);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  // ─── ITEMIZED extras ───
  const [discount, setDiscount] = useState(draft?.discount || 0);
  const [showDiscount, setShowDiscount] = useState(draft?.showDiscount || false);
  const discountRef = useRef(null);
  const [shareAuto, setShareAuto] = useState(draft?.shareAuto || false);

  // ─── Sheets / modals / save-loop ───
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [pendingSharePhone, setPendingSharePhone] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(!!draft && !isInline);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const hasUnsavedChanges = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimerRef = useRef(null);
  const [sessionRecentIds, setSessionRecentIds] = useState(new Set());
  const [lastSaleItems, setLastSaleItems] = useState([]);

  // ─── Rows engine (reused unchanged from ItemizedSaleView) ───
  const {
    rows,
    updateRow,
    deleteRow,
    undoDelete,
    undoStack,
    clearRows,
    addEmptyRows,
    ensureEmptyRow,
    filledRows,
    totalQty,
    totalAmount,
    buildItemsArray,
  } = useSmartSaleRows(3, draft?.rows || null);

  const creditSearchRef = useRef(null);
  const filteredCustomers = customers.filter(c =>
    (c.display_name || c.name || '').toLowerCase().includes(creditCustomerSearch.toLowerCase())
  );
  const selectedCustomerRecord = customers.find(c => c.id === creditCustomerId);
  const creditCustomerBalance = selectedCustomerRecord ? (selectedCustomerRecord.balance || 0) : 0;
  const recentCreditCustomers = useMemo(() =>
    customers
      .filter(c => c.last_activity_at)
      .sort((a, b) => (b.last_activity_at || 0) - (a.last_activity_at || 0))
      .slice(0, 4),
    [customers]
  );
  const dueDateOptions = useMemo(() => getDueDateOptions(), []);

  // ─── Derived totals — ONE calculation source across stages ───
  const currency = t.currencyShort;
  const sellingPrice = parseFloat(parseInput(amount)) || 0;
  const isCredit = paymentType === 'credit';
  const grandTotal = Math.max(0, totalAmount - discount);
  // The single live total: typed amount in SIMPLE, Σ lines − discount in ITEMIZED.
  const activeTotal = stage === 'itemized' ? grandTotal : sellingPrice;
  const partialReceivedAmount = parseFloat(parseInput(partialReceived)) || 0;
  const hasPartialAmount = partialReceivedAmount > 0 && partialReceivedAmount < activeTotal;
  const isPartial = paymentType === 'partial' || hasPartialAmount;
  const remainingAmount = isPartial ? Math.max(0, activeTotal - partialReceivedAmount) : 0;

  // Optional customer phone (D10) — accepts 09… / +2519… / 9… digit forms.
  const phoneEntered = creditCustomerPhone.trim().length > 0;
  const phoneDigitsClean = creditCustomerPhone.replace(/\D/g, '').slice(-9);
  const phoneValid = !phoneEntered || (phoneDigitsClean.length === 9 && /^[79]/.test(phoneDigitsClean));

  const getEffectiveDueTs = () =>
    customDueIso ? new Date(`${customDueIso}T12:00:00`).getTime() : selectedDueTs;

  const canSave = activeTotal > 0 && !isSaving && !justSaved && phoneValid && (
    stage === 'simple'
      ? sellingPrice > 0
      : (filledRows.length > 0 && totalAmount > 0)
  ) && (
    (!isCredit && !isPartial) ||
    (isCredit && !!creditCustomerId) ||
    (isPartial && partialReceivedAmount > 0 && partialReceivedAmount < activeTotal && !!creditCustomerId)
  );

  // ─── Draft auto-save (debounced) — covers SIMPLE and ITEMIZED state ───
  const draftRef = useRef({});
  useEffect(() => {
    draftRef.current = { stage, rows, amount, context, paymentType, paymentProvider, partialReceived, shareAuto, photos, discount, showDiscount };
    const timer = setTimeout(() => {
      // Never persist an empty capture — otherwise a stale "unfinished sale"
      // banner appears on every open after a clean save.
      const hasContent = draftRef.current.rows?.some(r => r.name?.trim() || r.price)
        || !!draftRef.current.amount
        || !!draftRef.current.context?.trim()
        || (draftRef.current.photos?.length > 0);
      if (hasContent) saveDraft(draftRef.current, draftKey);
    }, 500);
    return () => clearTimeout(timer);
  }, [stage, rows, amount, context, paymentType, paymentProvider, partialReceived, shareAuto, photos, discount, showDiscount]);

  // Track unsaved changes (drives discard confirm + beforeunload)
  useEffect(() => {
    hasUnsavedChanges.current = filledRows.length > 0 || photos.length > 0 || sellingPrice > 0 || !!context.trim();
  }, [filledRows, photos, sellingPrice, context]);

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

  // Auto-focus discount input when shown
  useEffect(() => {
    if (showDiscount) {
      discountRef.current?.focus();
      discountRef.current?.select();
    }
  }, [showDiscount]);

  // Fullscreen SIMPLE opens with the amount focused (deliberate act).
  // Inline strip NEVER auto-focuses — no keyboard pop on app open.
  useEffect(() => {
    if (!isInline && !draft) {
      setTimeout(() => { amountInputRef.current?.focus(); }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear pending "Saved ✓" flash timer on unmount
  useEffect(() => () => { if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current); }, []);

  // Row-delete undo toast (existing engine behavior)
  useEffect(() => {
    if (!undoStack) return;
    fireToast(t.toastDeletedUndo, 5000, () => undoDelete());
  }, [undoStack, t, undoDelete]);

  // ─── D3: SIMPLE → ITEMIZED. The typed amount becomes row 1 ───
  // (qty 1, name = context text if present); the manual amount ceases to
  // exist as a separate total — from here the total is always Σ lines −
  // discount. Collapsing is not offered; the stage is sticky until save.
  const handleAddDetails = useCallback(() => {
    if (stage === 'itemized') return;
    const firstRow = rows[0];
    if (sellingPrice > 0 && firstRow) {
      if (context.trim()) updateRow(firstRow.id, 'name', context.trim());
      updateRow(firstRow.id, 'price', String(sellingPrice));
    }
    setAmount('');
    setShowContextAc(false);
    setStage('itemized');
  }, [stage, rows, sellingPrice, context, updateRow]);

  // ─── Proof photo handlers — camera-only, max 3 (D6) ───
  const handleCameraPhoto = async (dataUrl) => {
    if (!dataUrl) return;
    if (photos.length >= MAX_PROOF_PHOTOS) {
      setPhotoError(t.photoMaxError);
      return;
    }
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      const proof = createPhotoProof(dataUrl);
      if (proof) {
        setPhotos(prev => [...prev, proof].slice(0, MAX_PHOTOS));
      }
    } catch (err) {
      setPhotoError(err.message || t.photoCaptureError);
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
    setPhotoError(null);
  };

  // ─── Share text builder (receipt paper — ITEMIZED only, D21) ───
  const buildShareText = useCallback(() => {
    const items = buildItemsArray();
    const shopName = shopProfile?.name || actorLabel || t.shopFallback;
    const shopPhone = shopProfile?.phone || '';
    const grandTotalVal = Math.max(0, totalAmount - discount);

    let lines = [];
    if (shopName) lines.push(shopName);
    if (shopPhone) lines.push(shopPhone);
    lines.push('');
    items.forEach(it => {
      if (it.name) lines.push(`${it.name}  ×${it.qty}  ${fmt(it.amount)} ${t.currencyShort}`);
    });
    lines.push('');
    if (discount > 0) lines.push(`${t.subtotalLabel}: ${fmt(totalAmount)} ${t.currencyShort}`);
    if (discount > 0) lines.push(`-${t.discountLabel}: ${fmt(discount)} ${t.currencyShort}`);
    lines.push(`${t.totalLabel}: ${fmt(grandTotalVal)} ${t.currencyShort}`);
    lines.push(`${t.paymentLabel}: ${paymentType === 'cash' ? t.cash : paymentProvider || paymentType}`);
    lines.push('');
    lines.push(t.shareFooter);

    return lines.join('\n');
  }, [shopProfile, actorLabel, buildItemsArray, totalAmount, discount, paymentType, paymentProvider, t]);

  const doShare = useCallback(async () => {
    const shareText = buildShareText();
    if (navigator.share) {
      navigator.share({ title: t.shareTitle, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        fireToast(t.copiedToClipboard, 2000);
      }).catch(() => {});
    }
  }, [buildShareText, t]);

  // ─── Unified save — identical DB field names as the two legacy paths ───
  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const photoFields = buildPhotoFields(photos);
      const dueTs = getEffectiveDueTs();
      const isItemizedStage = stage === 'itemized';
      let data;

      if (isItemizedStage) {
        // ITEMIZED shape — byte-identical to legacy ItemizedSaleView output.
        const items = buildItemsArray();
        const itemNameForSave = items.map(i => i.name).join(', ').substring(0, 200);
        data = {
          type: 'sale',
          item_name: itemNameForSave,
          catalog_entry_id: items[0]?.catalog_entry_id || null,
          item_kind: items[0]?.item_kind || null,
          quantity: totalQty,
          amount: grandTotal,
          cost_price: 0,
          profit: null,
          is_credit: false,
          customer_id: (isCredit || isPartial) ? creditCustomerId : null,
          customer_name: (isCredit || isPartial) ? (creditCustomerName || creditCustomerSearch) : null,
          customer_phone: (isCredit || isPartial) ? (normalizeEthiopianPhone(creditCustomerPhone) || null) : null,
          due_date: (isCredit || isPartial) ? dueTs : null,
          payment_type: paymentType === 'cash' ? 'cash' : paymentType,
          payment_provider: paymentType !== 'cash' ? paymentProvider || null : null,
          direction: null,
          ...photoFields,
          items,
          settlement_mode: isCredit ? 'credit' : (isPartial ? 'partial' : 'paid'),
          cash_received: isCredit ? 0 : (isPartial ? (paymentType === 'cash' ? partialReceivedAmount : 0) : (paymentType === 'cash' ? grandTotal : 0)),
          credit_amount: isPartial ? remainingAmount : (isCredit ? grandTotal : 0),
          sale_settlement_mode: isCredit ? 'credit' : (isPartial ? 'partial' : 'paid'),
          paid_amount: isCredit ? 0 : (isPartial ? partialReceivedAmount : grandTotal),
          remaining_amount: isPartial ? remainingAmount : 0,
          settlement_due_date: (isCredit || isPartial) ? dueTs : null,
          entered_total: null,
          items_subtotal: totalAmount,
          discount: discount > 0 ? discount : null,
          amount_basis: 'items',
          created_at: Date.now(),
        };
      } else {
        // SIMPLE shape — identical to legacy TransactionForm sale branch.
        data = {
          type: 'sale',
          item_name: context.trim() || null,
          catalog_entry_id: selectedCatalogEntryId || null,
          item_kind: selectedCatalogKind || null,
          quantity: 1,
          amount: sellingPrice,
          cost_price: 0,
          profit: null,
          is_credit: false,
          customer_id: (isCredit || isPartial) ? creditCustomerId : null,
          customer_name: (isCredit || isPartial) ? (creditCustomerName || creditCustomerSearch) : null,
          customer_phone: (isCredit || isPartial) ? (normalizeEthiopianPhone(creditCustomerPhone) || null) : null,
          due_date: (isCredit || isPartial) ? dueTs : null,
          payment_type: paymentType === 'cash' ? 'cash' : paymentType,
          payment_provider: paymentType !== 'cash' ? paymentProvider || null : null,
          direction: null,
          ...photoFields,
          items: null,
          settlement_mode: isCredit ? 'credit' : (isPartial ? 'partial' : 'paid'),
          cash_received: isCredit ? 0 : (isPartial ? (paymentType === 'cash' ? partialReceivedAmount : 0) : (paymentType === 'cash' ? sellingPrice : 0)),
          credit_amount: isPartial ? remainingAmount : (isCredit ? sellingPrice : 0),
          sale_settlement_mode: isCredit ? 'credit' : (isPartial ? 'partial' : 'paid'),
          paid_amount: isCredit ? 0 : (isPartial ? partialReceivedAmount : sellingPrice),
          remaining_amount: isPartial ? remainingAmount : 0,
          settlement_due_date: (isCredit || isPartial) ? dueTs : null,
          entered_total: sellingPrice,
          items_subtotal: null,
          discount: null,
          amount_basis: null,
          created_at: Date.now(),
        };
      }

      const saved = await onSave(data);
      const savedId = saved?.id ?? null;

      // Catalog learning — ITEMIZED path keeps the legacy behavior exactly
      // (use_count/last_price refresh + auto-remember unknown names).
      if (isItemizedStage) {
        try {
          const items = buildItemsArray();
          const savedCatalogIds = [];
          for (const item of items) {
            if (item.catalog_entry_id) {
              savedCatalogIds.push(item.catalog_entry_id);
              await db.catalog_entries.where('id').equals(item.catalog_entry_id).modify(entry => {
                entry.use_count = (entry.use_count || 0) + 1;
                entry.last_used_at = Date.now();
                entry.last_price = item.unit_price;
              });
            }
          }
          for (const item of items) {
            if (!item.catalog_entry_id && item.name) {
              const existing = catalogEntries.find(e => e.name === item.name);
              if (existing) {
                savedCatalogIds.push(existing.id);
                await db.catalog_entries.where('id').equals(existing.id).modify(entry => {
                  entry.use_count = (entry.use_count || 0) + 1;
                  entry.last_used_at = Date.now();
                  entry.last_price = item.unit_price;
                });
              } else {
                try {
                  const catSaved = await onSaveCatalogEntry?.({ name: item.name, kind: 'item', default_price: item.unit_price || null });
                  if (catSaved?.id) savedCatalogIds.push(catSaved.id);
                } catch { /* non-critical */ }
              }
            }
          }
          setSessionRecentIds(new Set(savedCatalogIds));
          setLastSaleItems(items.map(i => i.name));
        } catch (err) {
          if (import.meta.env.DEV) console.warn('Sale item learning failed:', err);
        }
      }

      // ─── Post-save: STAY IN PLACE (D15) ───
      // Reset transaction-specific state only; payment method persists as the
      // new "last used" default. No onDone() eject.
      setStage('simple');
      setAmount('');
      setContext('');
      setSelectedCatalogEntryId(null);
      setSelectedCatalogKind(null);
      setShowContextAc(false);
      clearRows();
      setPhotos([]);
      setPartialReceived('');
      setDiscount(0);
      setShowDiscount(false);
      setCreditCustomerId(null);
      setCreditCustomerName('');
      setCreditCustomerSearch('');
      setCreditCustomerPhone('');
      setSelectedDueTs(null);
      setCustomDueIso('');
      hasUnsavedChanges.current = false;
      clearDraft(draftKey);

      // 1.2s "Saved ✓" button flash (legacy justSaved morph)
      setJustSaved(true);
      if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
      justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 1200);

      // 4s UNDO toast (spec §16 / V2 §11) — soft-delete via the app's
      // existing tombstone path, which itself offers restore.
      if (savedId && onDeleteTransaction) {
        fireToast(t.savedUndoLabel, 4000, () => onDeleteTransaction(savedId));
      } else {
        fireToast(shareAuto && isItemizedStage ? t.toastCompletedShared : t.toastCompleted, 2000);
      }

      // Share-to-customer (ITEMIZED + toggle only, D21)
      if (isItemizedStage && shareAuto) {
        if (!shopProfile?.phone) {
          setShowPhonePrompt(true);
        } else {
          doShare();
        }
      }
    } catch (err) {
      // ERROR: all entered data stays intact for correction.
      fireToast(t.saveFailed, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Back / discard (fullscreen only) ───
  const handleBack = () => {
    if (hasUnsavedChanges.current) {
      setShowDiscardConfirm(true);
    } else {
      clearDraft(draftKey);
      onDone?.();
    }
  };

  const resetCaptureState = () => {
    setStage('simple');
    setAmount('');
    setContext('');
    setShowContextAc(false);
    clearRows();
    setPhotos([]);
    setPartialReceived('');
    setDiscount(0);
    setShowDiscount(false);
    setCreditCustomerId(null);
    setCreditCustomerName('');
    setCreditCustomerSearch('');
    setCreditCustomerPhone('');
    setSelectedDueTs(null);
    setCustomDueIso('');
  };

  const confirmDiscard = () => {
    hasUnsavedChanges.current = false;
    clearDraft(draftKey);
    resetCaptureState();
    setShowDiscardConfirm(false);
    onDone?.();
  };

  const restoreDraft = () => {
    if (!draft) return;
    setShowDraftBanner(false);
    fireToast(t.toastDraftRestored, 2000);
  };

  const discardDraft = () => {
    clearDraft(draftKey);
    setShowDraftBanner(false);
    setPaymentType('cash');
    setPaymentProvider('');
    resetCaptureState();
  };

  // Viewers without record permission get nothing in the inline strip.
  if (isInline && !canAddRecords) return null;

  const saveCtaBase = isInline ? t.saveNextBtn : (shareAuto && stage === 'itemized' ? t.completeShareBtn : t.completeSaleBtn);

  return (
    <div
      className={isInline
        ? 'space-y-1 px-3 py-2.5'
        : 'fixed inset-x-0 top-0 bottom-[60px] max-w-md mx-auto flex flex-col'}
      style={isInline
        ? { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }
        : { background: 'var(--color-surface)' }}
    >
      {/* Draft recovery banner (fullscreen only — inline restores silently) */}
      {showDraftBanner && draft && (
        <div className="flex-shrink-0 px-2 py-1.5 flex items-center justify-between" style={{ background: 'var(--color-warning-bg)' }}>
          <span className="text-[11px] font-bold" style={{ color: 'var(--color-warning)' }}>
            {t.draftBannerTitle}
          </span>
          <div className="flex gap-2">
            <button onClick={restoreDraft} className="text-[11px] font-bold px-1.5" style={{ color: 'var(--color-success-text)' }}>
              {t.restoreDraft}
            </button>
            <button onClick={discardDraft} className="text-[11px] font-bold px-1.5" style={{ color: 'var(--color-danger)' }}>
              {t.discardDraft}
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen header — back · title · camera · recent sales */}
      {!isInline && (
        <div className="flex-shrink-0 px-2 py-1.5 flex items-center justify-between">
          <button
            onClick={handleBack}
            aria-label={t.backAria}
            title={t.backAria}
            className="press-scale flex items-center justify-center"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          </button>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>
            {t.newSaleTitle}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCamera(true)}
              aria-label={t.photoAddAria}
              title={t.photoAddAria}
              className="press-scale flex items-center justify-center relative"
              style={{ minWidth: '44px', minHeight: '44px' }}
              disabled={photoLoading}
            >
              {photoLoading ? (
                <span className="text-xs">...</span>
              ) : (
                <Camera className="w-4 h-4" style={{ color: photos.length > 0 ? 'var(--color-success)' : 'var(--color-text-soft)' }} />
              )}
              {photos.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] font-black" style={{ color: 'var(--color-success)' }}>
                  {photos.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowRecentSales(true)}
              className="press-scale flex items-center justify-center"
              style={{ minWidth: '44px', minHeight: '44px' }}
              aria-label={t.todaySalesTitle}
              title={t.todaySalesTitle}
            >
              <span className="text-base">📋</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline strip header — title · camera · recent sales */}
      {isInline && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            {t.newSaleBtn}
          </span>
          <div className="flex items-center">
            <button
              onClick={() => setShowCamera(true)}
              aria-label={t.photoAddAria}
              className="press-scale flex items-center justify-center relative"
              style={{ minWidth: '36px', minHeight: '36px' }}
              disabled={photoLoading}
            >
              {photoLoading ? (
                <span className="text-[10px]">…</span>
              ) : (
                <Camera className="w-3.5 h-3.5" style={{ color: photos.length > 0 ? 'var(--color-success)' : 'var(--color-text-soft)' }} />
              )}
              {photos.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] font-black" style={{ color: 'var(--color-success)' }}>
                  {photos.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowRecentSales(true)}
              className="press-scale flex items-center justify-center"
              style={{ minWidth: '36px', minHeight: '36px' }}
              aria-label={t.todaySalesTitle}
            >
              <span className="text-[13px]">📋</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Capture zone: simple amount / itemized rows + shared sections ─── */}
      <div className={isInline ? '' : 'flex-1 overflow-y-auto'}>

        {/* SIMPLE: big amount + context field (writes item_name) with autocomplete */}
        {stage === 'simple' && (
          <div className="px-2 py-1 space-y-1.5">
            <div className="flex items-baseline gap-2">
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={fmtInput(amount)}
                onChange={(e) => setAmount(e.target.value.replace(/,/g, '').replace(/[^\d.]/g, ''))}
                placeholder="0"
                aria-label={t.amountAria}
                className="flex-1 min-w-0 font-black focus:outline-none bg-transparent"
                style={{ fontSize: '38px', lineHeight: 1.2, color: 'var(--color-text)', minHeight: '52px', border: 'none' }}
              />
              <span className="text-sm font-bold" style={{ color: 'var(--color-text-soft)' }}>{currency}</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={context}
                onChange={(e) => {
                  setContext(e.target.value);
                  setShowContextAc(e.target.value.trim().length > 0);
                  setSelectedCatalogEntryId(null);
                  setSelectedCatalogKind(null);
                }}
                onFocus={() => { if (context.trim()) setShowContextAc(true); }}
                onBlur={() => setTimeout(() => setShowContextAc(false), 200)}
                placeholder={t.whatDidYouSell}
                className="w-full px-2 py-2 text-[13px] font-medium focus:outline-none"
                style={{ border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-sm)', minHeight: '44px', background: 'var(--color-bg-white)' }}
                autoComplete="off"
              />
              {showContextAc && context.trim() && (
                <div className="absolute left-0 right-0 top-full z-20">
                  <MerchantMemoryAutocomplete
                    query={context}
                    catalogEntries={catalogEntries}
                    sessionRecentIds={sessionRecentIds}
                    lastSaleItems={lastSaleItems}
                    onSelect={(entry) => {
                      setContext(entry.name);
                      setSelectedCatalogEntryId(entry.id);
                      setSelectedCatalogKind(entry.kind || 'item');
                      setShowContextAc(false);
                    }}
                    onRemember={(name) => {
                      setContext(name);
                      setShowContextAc(false);
                      onSaveCatalogEntry?.({ name, kind: 'item', default_price: null });
                    }}
                  />
                </div>
              )}
            </div>
            {/* D3: grows THIS screen into the itemized view — typed amount becomes row 1 */}
            <button
              type="button"
              onClick={handleAddDetails}
              className="w-full py-2 text-[11px] font-bold press-scale flex items-center justify-center gap-1"
              style={{ color: 'var(--color-text-muted)', border: '1px dashed var(--color-text-soft)', borderRadius: 'var(--radius-sm)', minHeight: '40px', background: 'var(--color-surface-subtle)' }}
            >
              + {t.addDetailsLabel}
            </button>
          </div>
        )}

        {/* ITEMIZED: notebook lines (3 pre-rendered, auto-grow engine, D6/D7/D8) */}
        {stage === 'itemized' && (
          <div>
            <div className="px-2 flex gap-1 items-center" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest truncate" style={{ flex: '34 0 0%', color: 'var(--color-text-soft)', minWidth: 0 }}>
                {t.colItem}
              </span>
              <span className="text-[10px] font-bold text-center uppercase tracking-widest flex-shrink-0" style={{ width: '64px', color: 'var(--color-text-soft)' }}>
                {t.colQty}
              </span>
              <span className="text-[10px] font-bold text-right uppercase tracking-widest flex-shrink-0" style={{ width: '84px', color: 'var(--color-text-soft)' }}>
                {t.colPrice}
              </span>
              <span className="text-[10px] font-bold text-right uppercase tracking-widest flex-shrink-0" style={{ width: '88px', color: 'var(--color-text-soft)' }}>
                {t.colTotal}
              </span>
            </div>
            <div className={isInline ? 'px-2 max-h-[45vh] overflow-y-auto' : 'px-2'}>
              {rows.map((row, idx) => (
                <ItemRow
                  key={row.id}
                  row={row}
                  index={idx}
                  catalogEntries={catalogEntries}
                  sessionRecentIds={sessionRecentIds}
                  lastSaleItems={lastSaleItems}
                  onUpdate={updateRow}
                  onDelete={deleteRow}
                  onRemember={async (name) => {
                    await onSaveCatalogEntry?.({ name, kind: 'item', default_price: null });
                  }}
                  onEnterLastRow={ensureEmptyRow}
                  isLastRow={idx === rows.length - 1}
                  autoFocus={!isInline && idx === 0 && !sellingPrice}
                />
              ))}
              {filledRows.length >= 1 && (
                <div className="py-1.5 px-1">
                  <button
                    onClick={() => addEmptyRows(3)}
                    className="w-full py-2 text-[11px] font-bold press-scale flex items-center justify-center gap-1"
                    style={{ color: 'var(--color-text-muted)', border: '1px dashed var(--color-text-soft)', borderRadius: '4px', minHeight: '40px', background: 'var(--color-surface-subtle)' }}
                  >
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span>
                    <span>{t.addRowsBtn}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Proof photos — camera-only, max 3 (D6) */}
        {photos.length > 0 && (
          <div className="px-2 py-1">
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-[10px] font-bold pt-1" style={{ color: 'var(--color-success)' }}>📷 {photos.length}</span>
              {photos.map(entry => (
                <div key={entry.id} className="relative">
                  <img src={entry.dataUrl} alt="" className="w-12 h-12 object-cover" style={{ borderRadius: 6 }} />
                  <button
                    onClick={() => handleRemovePhoto(entry.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[9px] font-bold"
                    style={{ borderRadius: 999, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-danger)' }}
                  >✕</button>
                  <p className="text-[8px] text-center" style={{ color: 'var(--color-text-soft)' }}>{Math.round(photoSizeBytes(entry.dataUrl) / 1024)}KB</p>
                </div>
              ))}
              <span className="text-[9px] pt-2" style={{ color: 'var(--color-text-soft)' }}>{t.proofHelper}</span>
            </div>
          </div>
        )}
        {photoError && (
          <p className="px-2 text-[10px] font-semibold" style={{ color: 'var(--color-danger)' }}>{photoError}</p>
        )}

        {/* Payment chips — Cash / banks / wallets / Credit / Partial + add provider */}
        <div className="px-2 py-1 flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
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
          </div>
          <AddProviderButton onAddProvider={onAddProvider} />
        </div>
      </div>

      {/* ─── Bottom zone: partial · credit · summary · save ─── */}
      <div className={isInline ? '' : 'flex-shrink-0'} style={isInline ? {} : { background: 'var(--color-surface)' }}>

        {/* Partial — amount received (D1/D9) */}
        {isPartial && (
          <div className="px-2 py-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {t.amountReceivedLabel} <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={fmtInput(partialReceived)}
                onChange={e => setPartialReceived(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0"
                className="w-full p-3 pr-16 border-2 focus:outline-none text-base"
                style={{ borderRadius: 'var(--radius-md)', borderColor: partialReceivedAmount > 0 && partialReceivedAmount < activeTotal ? 'var(--color-primary)' : 'var(--color-border)' }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-semibold" style={{ color: 'var(--color-text-soft)' }}>
                {currency}
              </span>
            </div>
            {partialReceivedAmount > 0 && partialReceivedAmount < activeTotal && (
              <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--color-accent-amber)' }}>
                {t.creditOwedLabel}: {fmt(remainingAmount)} {currency}
              </p>
            )}
            {partialReceivedAmount >= activeTotal && activeTotal > 0 && (
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-danger)' }}>
                {t.fullAmountUseCash}
              </p>
            )}
          </div>
        )}

        {/* Credit/Partial — customer block (D4/D5/D10/D11) */}
        {(isCredit || isPartial) && (
          <div className="px-2 py-1.5 space-y-1.5">
            {/* Search + Add button */}
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  ref={creditSearchRef}
                  type="text"
                  value={creditCustomerSearch}
                  onChange={e => setCreditCustomerSearch(e.target.value)}
                  placeholder={t.customerNamePlaceholder}
                  className="w-full px-2 py-1.5 text-[11px] border font-bold"
                  style={{ borderColor: creditCustomerId ? 'var(--color-success)' : 'var(--color-border-light)', borderRadius: 'var(--radius-sm)', minHeight: '38px' }}
                />
                {creditCustomerSearch && !creditCustomerId && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-white border shadow-sm max-h-[160px] overflow-y-auto" style={{ borderColor: 'var(--color-border-light)', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)' }}>
                    {filteredCustomers.length > 0 ? (
                      <>
                        {filteredCustomers.slice(0, 6).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const cname = c.display_name || c.name || '';
                              setCreditCustomerId(c.id);
                              setCreditCustomerName(cname);
                              setCreditCustomerPhone(c.phone || '');
                              setCreditCustomerSearch(cname);
                            }}
                            className="w-full px-2.5 py-2 text-left text-[11px] font-bold border-b flex items-center gap-2"
                            style={{ borderColor: 'var(--color-border-light)', minHeight: '40px' }}
                          >
                            <span>{c.display_name || c.name}</span>
                            {c.phone && <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{c.phone}</span>}
                          </button>
                        ))}
                        {onAddCustomerInline && (
                          <button
                            type="button"
                            onClick={async () => {
                              const name = creditCustomerSearch.trim();
                              if (!name) return;
                              const savedCust = await onAddCustomerInline({ display_name: name });
                              if (savedCust?.id) {
                                setCreditCustomerId(savedCust.id);
                                setCreditCustomerName(savedCust.display_name || savedCust.name || name);
                                setCreditCustomerSearch(savedCust.display_name || savedCust.name || name);
                              }
                            }}
                            className="w-full px-2.5 py-2 text-left text-[11px] font-bold border-t border-dashed"
                            style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', minHeight: '40px' }}
                          >
                            + {t.addAsNewCustomer}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="px-2.5 py-2.5 text-[11px]" style={{ color: 'var(--color-text-soft)' }}>
                        {t.noCustomerMatch}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={async () => {
                  const name = creditCustomerSearch.trim();
                  if (!name) {
                    creditSearchRef.current?.focus();
                    return;
                  }
                  if (!onAddCustomerInline) return;
                  const savedCust = await onAddCustomerInline({ display_name: name, phone_number: creditCustomerPhone || null });
                  if (savedCust?.id) {
                    setCreditCustomerId(savedCust.id);
                    setCreditCustomerName(savedCust.display_name || savedCust.name || name);
                    setCreditCustomerSearch(savedCust.display_name || savedCust.name || name);
                  }
                }}
                className="flex-shrink-0 px-3 text-[11px] font-bold border press-scale"
                style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', minHeight: '38px', background: 'rgba(22,163,74,0.06)' }}
              >
                <span className="text-[14px] mr-1">+</span>{t.addShortBtn}
              </button>
            </div>

            {/* Recent credit customers — quick-select chips */}
            {!creditCustomerSearch && !creditCustomerId && recentCreditCustomers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recentCreditCustomers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      const cname = c.display_name || c.name || '';
                      setCreditCustomerId(c.id);
                      setCreditCustomerName(cname);
                      setCreditCustomerPhone(c.phone || '');
                      setCreditCustomerSearch(cname);
                    }}
                    className="px-2.5 py-1.5 text-[11px] font-bold border press-scale"
                    style={{ borderColor: 'var(--color-border-light)', borderRadius: 'var(--radius-sm)', minHeight: '36px', background: 'var(--color-bg-white)' }}
                  >
                    {c.display_name || c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Selected customer summary */}
            {creditCustomerId && (
              <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: 'rgba(22,163,74,0.06)', borderRadius: 'var(--radius-sm)', minHeight: '42px' }}>
                <span className="text-[13px] font-bold flex-1">{creditCustomerName}</span>
                {creditCustomerPhone && <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{creditCustomerPhone}</span>}
                <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>
                  {t.balanceShort} {fmt(creditCustomerBalance)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCreditCustomerId(null);
                    setCreditCustomerName('');
                    setCreditCustomerPhone('');
                    setCreditCustomerSearch('');
                    setSelectedDueTs(null);
                    setCustomDueIso('');
                  }}
                  className="text-[12px] font-bold press-scale px-1" style={{ color: 'var(--color-text-soft)', minHeight: '30px' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Optional customer phone (D10) */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-soft)' }}>
                {t.customerPhoneLabel}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={creditCustomerPhone}
                onChange={(e) => setCreditCustomerPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 12))}
                placeholder="0912345678"
                className="w-full px-2 py-1.5 text-[12px] font-bold"
                style={{ border: '1px solid ' + (phoneEntered && !phoneValid ? 'var(--color-danger)' : 'var(--color-border-light)'), borderRadius: 'var(--radius-sm)', minHeight: '38px', background: 'var(--color-bg-white)' }}
              />
              {phoneEntered && !phoneValid && (
                <p className="text-[10px] mt-0.5 font-semibold" style={{ color: 'var(--color-danger)' }}>{t.invalidPhone}</p>
              )}
            </div>

            {/* Due date — Ethiopian calendar chips + custom picker (D5/D11) */}
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-soft)' }}>
                {t.dueDate}
              </div>
              <div className="flex gap-2 mb-2 flex-wrap">
                {dueDateOptions.map(opt => {
                  const active = selectedDueTs === opt.value && !customDueIso;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => { setSelectedDueTs(opt.value); setCustomDueIso(''); }} className="press-scale"
                      style={{
                        padding: '8px 12px', minWidth: 70, minHeight: 40,
                        border: `2px solid ${active ? 'var(--color-success)' : 'var(--color-border)'}`,
                        borderRadius: 8,
                        background: active ? 'var(--color-success)' : 'var(--color-bg-white)',
                        color: active ? 'var(--color-bg-white)' : 'var(--color-text)',
                        fontSize: '0.8rem', fontWeight: 700,
                        cursor: 'pointer', flexShrink: 0,
                      }}>
                      {opt.label}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setShowDatePicker(true)} className="press-scale"
                  style={{
                    padding: '8px 12px', minWidth: 70, minHeight: 40,
                    border: `2px solid ${customDueIso ? 'var(--color-success)' : 'var(--color-border)'}`,
                    borderRadius: 8,
                    background: customDueIso ? 'var(--color-success)' : 'var(--color-bg-white)',
                    color: customDueIso ? 'var(--color-bg-white)' : 'var(--color-text)',
                    fontSize: '0.8rem', fontWeight: 700,
                    cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  📅 <span>{t.pickShort}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ITEMIZED summary — Items / Qty / Subtotal / Discount / Total (D21) */}
        {stage === 'itemized' && (
          <div className="px-2 py-1 space-y-0.5">
            <div className="flex justify-between items-center text-[11px]">
              <span style={{ color: 'var(--color-text-soft)' }}>
                {t.itemsCountLabel}: <span className="font-bold" style={{ color: 'var(--color-text)' }}>{filledRows.length}</span>
                <span className="ml-2">
                  {t.colQty}: <span className="font-bold" style={{ color: 'var(--color-text)' }}>{totalQty}</span>
                </span>
              </span>
              <span className="text-[11px]" style={{ color: 'var(--color-text-soft)' }}>
                {t.subtotalLabel}: <span className="font-bold" style={{ color: 'var(--color-text)' }}>{fmt(totalAmount)}</span>
              </span>
            </div>
            {showDiscount && (
              <div className="flex justify-between items-center" style={{ background: 'var(--color-warning-bg)', borderRadius: '3px', padding: '2px 6px', border: '1px solid var(--color-warning-border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--color-warning)' }}>{t.discountLabel}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px]" style={{ color: 'var(--color-danger)' }}>−</span>
                  <input
                    ref={discountRef}
                    type="text"
                    inputMode="decimal"
                    value={fmtInput(String(discount))}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
                      const val = parseFloat(raw) || 0;
                      setDiscount(Math.min(val, totalAmount));
                    }}
                    className="w-14 text-right text-[11px] font-bold px-0.5"
                    style={{ border: 'none', borderBottom: '1px solid var(--color-border)', borderRadius: '0', minHeight: '20px', background: 'transparent' }}
                  />
                </div>
              </div>
            )}
            {!showDiscount && totalAmount > 0 && (
              <button
                onClick={() => setShowDiscount(true)}
                className="text-[11px] font-bold press-scale"
                style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '4px 10px', minHeight: '34px' }}
              >
                + {t.discountLabel}
              </button>
            )}
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-[13px] font-black" style={{ color: 'var(--color-text)' }}>{t.totalLabel}</span>
              <span className="text-base font-black" style={{ color: 'var(--color-success)' }}>
                {fmt(grandTotal)} {currency}
              </span>
            </div>
          </div>
        )}

        {/* Save row — share toggle (itemized) · preview (fullscreen itemized) · CTA */}
        <div className="px-2 pb-2 pt-1 flex items-center gap-2 flex-wrap">
          {stage === 'itemized' && (
            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none press-scale" style={{ color: shareAuto ? 'var(--color-success)' : 'var(--color-text-soft)', whiteSpace: 'nowrap', minHeight: '44px' }}>
              <input
                type="checkbox"
                checked={shareAuto}
                onChange={(e) => setShareAuto(e.target.checked)}
                className="sr-only"
              />
              <div className="relative w-7 h-4 rounded-full transition-colors flex-shrink-0" style={{ background: shareAuto ? 'var(--color-success)' : 'var(--color-text-soft)' }}>
                <div className="absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white transition-transform" style={{ transform: shareAuto ? 'translateX(12px)' : 'translateX(0)' }} />
              </div>
              {t.shareToggle}
            </label>
          )}

          {stage === 'itemized' && !isInline && (
            <>
              <button
                type="button"
                onClick={() => setShowReceipt(true)}
                disabled={!canSave}
                className="px-2.5 py-2 text-xs font-bold press-scale"
                style={{ color: canSave ? 'var(--color-text-muted)' : 'var(--color-text-soft)', cursor: canSave ? 'pointer' : 'not-allowed', minHeight: '44px' }}
              >
                📄 {t.previewBtn}
              </button>
              <span className="text-[16px]" style={{ color: 'var(--color-bg-disabled)' }}>·</span>
            </>
          )}

          {showPhonePrompt && (
            <div className="flex items-center gap-1 flex-1 min-w-[180px]">
              <span className="text-[10px]" style={{ color: 'var(--color-text-soft)' }}>
                {t.phoneShortLabel}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={pendingSharePhone}
                onChange={(e) => setPendingSharePhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="0912345678"
                className="flex-1 text-[11px] font-bold px-1 py-0.5"
                style={{ border: 'none', borderBottom: '1px solid var(--color-border)', background: 'transparent', minHeight: '20px' }}
              />
              <button
                onClick={async () => {
                  if (pendingSharePhone.length === 9 && /^[79]/.test(pendingSharePhone)) {
                    const fullPhone = '+251' + pendingSharePhone;
                    await db.settings.put({ key: 'shop_phone', value: fullPhone });
                    shopProfile.phone = fullPhone;
                    setShowPhonePrompt(false);
                    doShare();
                  }
                }}
                className="text-[10px] font-bold px-1.5 py-0.5"
                style={{ color: 'var(--color-success)', background: 'var(--color-success-bg)', borderRadius: '3px' }}
              >
                {t.doneBtn}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={isInline
              ? 'w-full py-3 font-black text-sm flex items-center justify-center gap-1.5 transition-all press-scale'
              : 'px-4 py-2 font-black text-xs flex items-center justify-center gap-1 transition-all press-scale flex-1'}
            style={{
              background: justSaved ? 'var(--color-success-text)' : (canSave ? 'var(--color-success)' : 'var(--color-bg-disabled)'),
              color: canSave || justSaved ? 'var(--color-bg-white)' : 'var(--color-text-soft)',
              cursor: canSave ? 'pointer' : 'not-allowed',
              borderRadius: 'var(--radius-md)',
              minHeight: '48px',
            }}
          >
            {justSaved ? <Check className="w-4 h-4" /> : <Save className="w-3.5 h-3.5" />}
            {justSaved
              ? t.saleSaved
              : `${saveCtaBase}${activeTotal > 0 ? ` · ${fmt(activeTotal)}` : ''}`}
          </button>
        </div>
      </div>

      {/* Receipt Preview — paper style (ITEMIZED only, D21) */}
      {showReceipt && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.2)' }} onClick={() => setShowReceipt(false)}>
          <div className="bg-white w-full max-w-sm p-4" style={{ fontFamily: 'monospace' }} onClick={e => e.stopPropagation()}>
            <div className="text-center mb-2">
              <p className="text-sm font-black" style={{ color: 'var(--color-text)' }}>{actorLabel || 'Shop'}</p>
              {shopProfile?.phone && (
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{shopProfile.phone}</p>
              )}
              <p className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div className="border-t border-b py-1 mb-1.5" style={{ borderColor: 'var(--color-text-soft)' }}>
              <div className="flex justify-between text-[10px] font-bold mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <span style={{ flex: 2 }}>{t.colItem}</span>
                <span style={{ width: '28px', textAlign: 'center' }}>{t.colQty}</span>
                <span style={{ width: '56px', textAlign: 'right' }}>{t.colTotal}</span>
              </div>
              {buildItemsArray().map((it, i) => (
                <div key={i} className="flex justify-between text-[11px] py-0.5">
                  <span className="truncate" style={{ flex: 2, color: 'var(--color-text)' }}>{it.name}</span>
                  <span style={{ width: '28px', textAlign: 'center', color: 'var(--color-text)' }}>{it.qty}</span>
                  <span style={{ width: '56px', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-text)' }}>{fmt(it.amount)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-0.5 text-[11px] mb-2">
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>{t.subtotalLabel}</span>
                <span className="font-bold">{fmt(totalAmount)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>{t.discountLabel}</span>
                  <span style={{ color: 'var(--color-danger)' }}>−{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-0.5" style={{ borderColor: 'var(--color-text-soft)' }}>
                <span className="font-bold">{t.grandTotalLabel}</span>
                <span className="font-bold">{fmt(grandTotal)} {currency}</span>
              </div>
              <div className="flex justify-between" style={{ color: 'var(--color-text-muted)' }}>
                <span>{t.paymentLabel}</span>
                <span>{paymentType === 'cash' ? t.cash : paymentProvider || paymentType}</span>
              </div>
            </div>
            <button
              onClick={() => setShowReceipt(false)}
              className="w-full py-1.5 text-[10px] font-bold press-scale"
              style={{ color: 'var(--color-text-muted)', minHeight: '36px' }}
            >
              {t.closeReceiptBtn}
            </button>
          </div>
        </div>
        </Portal>
      )}

      {/* Discard confirmation (fullscreen) */}
      {showDiscardConfirm && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-xl p-4 max-w-sm w-full">
            <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
              {t.discardSaleTitle}
            </h3>
            <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
              {t.discardSaleBody}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 py-2 text-[11px] font-bold border-2 press-scale"
                style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', minHeight: '40px' }}
              >
                {t.continueBtn}
              </button>
              <button
                onClick={confirmDiscard}
                className="flex-1 py-2 text-[11px] font-bold text-white press-scale"
                style={{ background: 'var(--color-danger)', borderRadius: 'var(--radius-md)', minHeight: '40px' }}
              >
                {t.discardConfirmBtn}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Today's Sales sheet (D13) */}
      {showRecentSales && (
        <Portal>
        <RecentSalesSheet
          transactions={transactions}
          onClose={() => setShowRecentSales(false)}
          onHistory={onHistory}
          onViewTransaction={onViewTransaction}
        />
        </Portal>
      )}

      {/* Camera capture modal — proof photos, camera-only (D6) */}
      {showCamera && (
        <Portal>
          <CameraCapture
            open={showCamera}
            onCapture={(dataUrl) => { handleCameraPhoto(dataUrl); setShowCamera(false); }}
            onClose={() => setShowCamera(false)}
            lang={lang}
          />
        </Portal>
      )}

      {/* Ethiopian calendar custom due-date picker (D11) */}
      {showDatePicker && (
        <Portal>
          <InlineDatePicker
            open={showDatePicker}
            value={customDueIso}
            onChange={(iso) => { setCustomDueIso(iso); setSelectedDueTs(null); }}
            onClose={() => setShowDatePicker(false)}
            lang={lang}
          />
        </Portal>
      )}
    </div>
  );
}

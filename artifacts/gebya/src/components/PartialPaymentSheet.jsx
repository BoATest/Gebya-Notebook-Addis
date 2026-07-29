// PartialPaymentSheet.jsx — Dedicated full-screen sheet for partial payments.
//
// Opens when user clicks "Partial" on any money-exchange form.
// Keeps the main form clean by moving all partial-specific fields here.
//
// Props:
//   open          — boolean, controls visibility
//   totalAmount   — number, the full sale/expense amount
//   onSave        — (data) => void, called with partial payment data
//   onClose       — () => void
//   customers     — array of { id, display_name, name, balance, last_activity_at }
//   onAddCustomerInline — (partialCustomer) => Promise<customer>
//   enabledProviders — { banks: string[], wallets: string[] }
//   onAddProvider — (kind, name) => void
//   lang          — 'en' | 'am'
//   t             — translation object

import { useState, useMemo } from 'react';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { useLang } from '../context/LangContext';
import InlineDatePicker from './InlineDatePicker';
import { getDueDateOptions } from '../utils/ethiopianCalendar';
import { fmt, fmtInput, parseInput } from '../utils/numformat';
import PaymentTypeChips from './PaymentTypeChips';
import AddProviderButton from './AddProviderButton';

function PartialPaymentSheet({
  open,
  totalAmount = 0,
  onSave,
  onClose,
  customers = [],
  onAddCustomerInline,
  enabledProviders,
  onAddProvider,
}) {
  const { lang, t } = useLang();

  // ─── State ──────────────────────────────────────────────────────────────
  const [partialReceived, setPartialReceived] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerMatch, setCustomerMatch] = useState(null);
  const [selectedDue, setSelectedDue] = useState(null);
  const [customDue, setCustomDue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Derived ────────────────────────────────────────────────────────────
  const dueDateOptions = getDueDateOptions();
  const receivedAmount = parseFloat(parseInput(partialReceived)) || 0;
  const creditAmount = Math.max(0, totalAmount - receivedAmount);
  const isPartialValid = receivedAmount > 0 && receivedAmount < totalAmount && !!customerMatch;

  const recentCreditCustomers = useMemo(() =>
    customers
      .filter(c => c.last_activity_at)
      .sort((a, b) => (b.last_activity_at || 0) - (a.last_activity_at || 0))
      .slice(0, 4),
    [customers]
  );

  const getEffectiveDueDate = () => {
    if (selectedDue === 'custom' && customDue) return new Date(customDue).getTime();
    return selectedDue;
  };

  // ─── Reset ──────────────────────────────────────────────────────────────
  function resetForm() {
    setPartialReceived('');
    setPaymentType('cash');
    setPaymentProvider('');
    setCustomerQuery('');
    setCustomerMatch(null);
    setSelectedDue(null);
    setCustomDue('');
    setShowDatePicker(false);
    setIsSaving(false);
  }

  // ─── Save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isPartialValid || isSaving) return;
    setIsSaving(true);
    try {
      const data = {
        sale_settlement_mode: 'partial',
        paid_amount: receivedAmount,
        remaining_amount: creditAmount,
        credit_amount: creditAmount,
        settlement_mode: 'partial',
        cash_received: receivedAmount,
        payment_type: paymentType,
        payment_provider: paymentType !== 'cash' ? paymentProvider || null : null,
        customer_id: customerMatch.id,
        customer_name: customerMatch.display_name || customerMatch.name,
        settlement_due_date: getEffectiveDueDate(),
        due_date: getEffectiveDueDate(),
      };
      await onSave(data);
      resetForm();
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white max-w-md mx-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #e8e2d8' }}>
        <button onClick={() => { resetForm(); onClose(); }} aria-label={lang === 'am' ? 'ተመለስ' : 'Back'} className="press-scale flex items-center justify-center" style={{ minWidth: '36px', minHeight: '36px', padding: '4px' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: '#6b7280' }} />
        </button>
        <h2 className="text-base font-bold" style={{ color: '#C4883A' }}>
          {lang === 'am' ? '½ ከፊል ክፍያ' : '½ Partial Payment'}
        </h2>
        <div style={{ width: '36px' }} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">

        {/* Total amount display */}
        <div className="p-3" style={{ background: '#f7fcf8', border: '1px solid #d8eadf', borderRadius: 'var(--radius-md)' }}>
          <p className="text-xs font-bold" style={{ color: '#4b6855' }}>
            {lang === 'am' ? 'ጠቅላላ መጠን' : 'Total Amount'}
          </p>
          <p className="text-xl font-black" style={{ color: '#14532d' }}>
            {fmt(totalAmount)} {lang === 'am' ? 'ብር' : 'ETB'}
          </p>
        </div>

        {/* Amount Received */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#6b7280' }}>
            {lang === 'am' ? 'የተቀበሉት መጠን' : 'Amount Received'} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={fmtInput(partialReceived)}
              onChange={e => setPartialReceived(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0"
              autoFocus
              className="w-full p-3 pr-16 border-2 focus:outline-none text-lg font-bold"
              style={{
                borderRadius: 'var(--radius-md)',
                borderColor: receivedAmount > 0 && receivedAmount < totalAmount ? '#1B4332' : '#e8e2d8',
              }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#9ca3af' }}>
              {lang === 'am' ? 'ብር' : 'birr'}
            </span>
          </div>
          {receivedAmount > 0 && receivedAmount < totalAmount && (
            <p className="text-xs mt-1.5 font-semibold" style={{ color: '#C4883A' }}>
              {lang === 'am' ? 'ቀሪ ዱቤ' : 'Remaining Dubie'}: {fmt(creditAmount)} {lang === 'am' ? 'ብር' : 'birr'}
            </p>
          )}
          {receivedAmount >= totalAmount && totalAmount > 0 && (
            <p className="text-xs mt-1.5 font-medium" style={{ color: '#dc2626' }}>
              {lang === 'am' ? 'የተቀበሉት ሙሉ ነው — "ሙሉ" ይምረጡ' : 'Amount received equals total — use "Paid" instead.'}
            </p>
          )}
        </div>

        {/* Payment method for collected amount */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#6b7280' }}>
            {lang === 'am' ? 'የተቀበሉት እንዴት ተከፈለ?' : 'How was the amount paid?'}
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
          {paymentType !== 'cash' && paymentProvider && (
            <p className="text-xs font-semibold mt-1" style={{ color: '#065f46' }}>
              → {fmt(receivedAmount)} {lang === 'am' ? 'ብር' : 'ETB'} {lang === 'am' ? 'በ' : 'via'} {paymentProvider}
            </p>
          )}
        </div>

        {/* Customer search */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#6b7280' }}>
            {lang === 'am' ? 'ደንበኛ (ለቀሪው ዱቤ)' : 'Customer (for remaining Dubie)'} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={customerQuery}
                onChange={e => { setCustomerQuery(e.target.value); setCustomerMatch(null); }}
                placeholder={lang === 'am' ? 'ስም ይተይቡ...' : 'Type customer name...'}
                className="w-full px-2 py-1.5 text-[11px] border font-bold"
                style={{ borderColor: customerQuery ? '#16a34a' : '#edeae5', borderRadius: 'var(--radius-sm)', minHeight: '38px' }}
              />
              {customerQuery.trim() && !customerMatch && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border shadow-sm max-h-[160px] overflow-y-auto" style={{ borderColor: '#edeae5', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)' }}>
                  {customers.filter(c => { const q = customerQuery.trim().toLowerCase(); return !q || (c.display_name || c.name || '').toLowerCase().includes(q); }).length > 0 ? (
                    <>
                      {customers.filter(c => { const q = customerQuery.trim().toLowerCase(); return !q || (c.display_name || c.name || '').toLowerCase().includes(q); }).slice(0, 6).map(c => (
                        <button key={c.id} type="button" onClick={() => { setCustomerMatch(c); setCustomerQuery(c.display_name || c.name || ''); }}
                          className="w-full px-2.5 py-2 text-left text-[11px] font-bold border-b flex items-center justify-between gap-2" style={{ borderColor: '#f3f4f6', minHeight: '40px' }}>
                          <span>{c.display_name || c.name}</span>
                          {c.balance > 0 && <span className="text-[10px] font-bold" style={{ color: '#C4883A' }}>{lang === 'am' ? 'ዱቤ' : 'BAL'} {fmt(c.balance)}</span>}
                        </button>
                      ))}
                      {onAddCustomerInline && (
                        <button type="button" onClick={async () => { const name = customerQuery.trim(); if (!name) return; const saved = await onAddCustomerInline({ display_name: name }); if (saved?.id) { setCustomerMatch(saved); setCustomerQuery(saved.display_name || saved.name || ''); } }}
                          className="w-full px-2.5 py-2 text-left text-[11px] font-bold border-t border-dashed" style={{ borderColor: '#16a34a', color: '#16a34a', minHeight: '40px' }}>
                          + {lang === 'am' ? 'እንደ አዲስ ደንበኛ አክል' : 'Add as new customer'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="px-2.5 py-2.5 text-[11px]" style={{ color: '#9ca3af' }}>
                      {lang === 'am' ? 'ደንበኛ አልተገኘም' : 'No customer found'}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button type="button" onClick={async () => { const name = customerQuery.trim(); if (!name) return; if (!onAddCustomerInline) return; const saved = await onAddCustomerInline({ display_name: name }); if (saved?.id) { setCustomerMatch(saved); setCustomerQuery(saved.display_name || saved.name || ''); } }}
              className="flex-shrink-0 px-3 text-[11px] font-bold border press-scale"
              style={{ borderColor: '#16a34a', color: '#16a34a', borderRadius: 'var(--radius-sm)', minHeight: '38px', background: 'rgba(22,163,74,0.06)' }}>
              <span className="text-[14px] mr-1">+</span>{lang === 'am' ? 'አክል' : 'Add'}
            </button>
          </div>

          {/* Recent credit customers */}
          {!customerQuery && !customerMatch && recentCreditCustomers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {recentCreditCustomers.map(c => (
                <button key={c.id} type="button" onClick={() => { setCustomerMatch(c); setCustomerQuery(c.display_name || c.name || ''); }}
                  className="px-2.5 py-1.5 text-[11px] font-bold border press-scale" style={{ borderColor: '#edeae5', borderRadius: 'var(--radius-sm)', minHeight: '34px', background: '#fff' }}>
                  {c.display_name || c.name}
                </button>
              ))}
            </div>
          )}

          {/* Customer summary when selected */}
          {customerMatch && (
            <div className="flex items-center gap-2 px-2.5 py-2 mt-2" style={{ background: 'rgba(22,163,74,0.06)', borderRadius: 'var(--radius-sm)', minHeight: '42px' }}>
              <span className="text-[13px] font-bold flex-1">{customerMatch.display_name || customerMatch.name}</span>
              <span className="text-[10px] font-bold" style={{ color: '#6b7280' }}>
                {lang === 'am' ? 'ዱቤ' : 'BAL'} {fmt(customerMatch.balance || 0)}
              </span>
              <button type="button" onClick={() => { setCustomerMatch(null); setCustomerQuery(''); }} className="text-[12px] font-bold press-scale px-1" style={{ color: '#9ca3af', minHeight: '30px' }}>✕</button>
            </div>
          )}
        </div>

        {/* Due date */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#6b7280' }}>
            {lang === 'am' ? 'የቀሪው መክፈያ ቀን' : 'Remaining Due Date'} <span style={{ color: '#9ca3af', fontWeight: 600 }}>({lang === 'am' ? 'አማራጭ' : 'optional'})</span>
          </label>
          <div className="flex gap-2 mb-2">
            {dueDateOptions.map(opt => {
              const active = selectedDue === opt.value && !customDue;
              return (
                <button key={opt.value} type="button" onClick={() => setSelectedDue(opt.value)}
                  className="press-scale"
                  style={{
                    padding: '8px 12px', minWidth: 70, minHeight: 40,
                    border: `2px solid ${active ? '#2563eb' : '#e8e2d8'}`,
                    borderRadius: 8,
                    background: active ? '#2563eb' : '#fff',
                    color: active ? '#fff' : '#374151',
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
                border: `2px solid ${selectedDue === 'custom' && customDue ? '#2563eb' : '#e8e2d8'}`,
                borderRadius: 8,
                background: selectedDue === 'custom' && customDue ? '#2563eb' : '#fff',
                color: selectedDue === 'custom' && customDue ? '#fff' : '#374151',
                fontSize: '0.8rem', fontWeight: 700,
                cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
              📅 <span>{lang === 'am' ? 'ምረጥ' : 'Pick'}</span>
            </button>
          </div>
        </div>

        <InlineDatePicker open={showDatePicker} value={customDue} onChange={(iso) => { setCustomDue(iso); setSelectedDue('custom'); }} onClose={() => setShowDatePicker(false)} lang={lang} />
      </div>

      {/* Save button */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-3" style={{ borderTop: '1px solid #e8e2d8', background: '#fff' }}>
        {!isPartialValid && receivedAmount > 0 && !customerMatch && (
          <p className="text-xs font-semibold text-center mb-2" style={{ color: '#92400e' }}>
            {lang === 'am' ? 'ከላይ ደንበኛ ይምረጡ ወይም ያክሉ' : 'Select or add a customer above'}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isPartialValid || isSaving}
          className="w-full p-3 font-black text-base flex items-center justify-center gap-2 transition-all press-scale"
          style={{
            background: isPartialValid && !isSaving ? '#C4883A' : '#e5e7eb',
            color: (isPartialValid && !isSaving) ? '#fff' : '#9ca3af',
            cursor: isPartialValid && !isSaving ? 'pointer' : 'default',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {isSaving
            ? (lang === 'am' ? 'በማስቀመጥ ላይ...' : 'Saving...')
            : <><Save className="w-5 h-5" />{lang === 'am' ? 'ከፊል ክፍያ አስቀምጥ' : 'Save Partial Payment'}</>
          }
        </button>
      </div>
    </div>
  );
}

export default PartialPaymentSheet;
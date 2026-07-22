import { useState, useEffect } from 'react';
import db, { saveSettlement, updateSettlement } from '../../db';
import { calculateExpected, generateSettlementId, getLastSettlementPeriod, loadSettlementFromLocalStorage, saveSettlementDraft, clearSettlementDraft } from '../../utils/settlementSelectors';
import { fmt } from '../../utils/numformat';

export default function SettlementSheet({ staff, existingSettlement, lang = 'en', onSaved, onCancel }) {
  const isReconcile = Boolean(existingSettlement);

  const [loading, setLoading] = useState(true);
  const [expected, setExpected] = useState({ expectedCash: 0, expectedTransfer: 0, expectedTotal: 0, transactionCount: 0 });
  const [period, setPeriod] = useState({ start: 0, end: 0 });
  const [actualCash, setActualCash] = useState('');
  const [actualTransfer, setActualTransfer] = useState('');
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('expense');
  const [notes, setNotes] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(isReconcile ? 'view' : 'new');

  useEffect(() => {
    (async () => {
      try {
        if (existingSettlement) {
          const s = existingSettlement;
          setPeriod({ start: s.period_start, end: s.period_end });
          setExpected({
            expectedCash: s.expected_cash || 0,
            expectedTransfer: s.expected_transfer || 0,
            expectedTotal: s.expected_total || 0,
            transactionCount: 0,
          });
          setActualCash(String(s.actual_cash || ''));
          setActualTransfer(String(s.actual_transfer || ''));
          setAdjustments(s.adjustments || []);
          setNotes(s.notes || '');
        } else {
          const lastSettled = await getLastSettlementPeriod(staff.id);
          const periodStart = lastSettled || 0;
          const periodEnd = Date.now();
          setPeriod({ start: periodStart, end: periodEnd });

          const calc = await calculateExpected(String(staff.id), periodStart, periodEnd);
          setExpected(calc);

          const draft = loadSettlementFromLocalStorage(String(staff.id));
          if (draft) {
            setActualCash(String(draft.actualCash || ''));
            setActualTransfer(String(draft.actualTransfer || ''));
            setAdjustments(draft.adjustments || []);
            setNotes(draft.notes || '');
          }
        }
      } catch (e) {
        setError('Failed to load settlement data');
      }
      setLoading(false);
    })();
  }, [staff.id, existingSettlement]);

  useEffect(() => {
    if (loading || mode === 'view') return;
    saveSettlementDraft(String(staff.id), {
      actualCash: Number(actualCash) || 0,
      actualTransfer: Number(actualTransfer) || 0,
      adjustments,
      notes,
    });
  }, [actualCash, actualTransfer, adjustments, notes, loading, mode]);

  const actualCashVal = Number(actualCash) || 0;
  const actualTransferVal = Number(actualTransfer) || 0;
  const actualTotal = actualCashVal + actualTransferVal;

  const adjTotal = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const adjCash = adjustments.filter(a => a.type === 'expense' || a.type === 'credit_to_owner').reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const finalExpectedCash = expected.expectedCash - adjCash;
  const finalExpectedTotal = expected.expectedTotal - adjTotal;
  const cashVariance = actualCashVal - finalExpectedCash;
  const totalVariance = actualTotal - finalExpectedTotal;

  const handleAddAdjustment = () => {
    const amount = Number(adjustmentAmount) || 0;
    if (amount === 0 && !adjustmentNote.trim()) return;
    setAdjustments([...adjustments, {
      type: adjustmentType,
      amount,
      note: adjustmentNote.trim(),
      addedBy: 'owner',
      addedAt: new Date().toISOString(),
    }]);
    setAdjustmentAmount('');
    setAdjustmentNote('');
  };

  const handleRemoveAdjustment = (index) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (mode === 'view') return;
    if (actualCashVal === 0 && actualTransferVal === 0) {
      setError('Enter at least actual cash or transfer amount');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const staffIdNum = Number(staff.id);
      const now = Date.now();

      if (isReconcile && mode === 'reconcile') {
        const adjustmentsWithReconcile = [
          ...adjustments,
          ...(reconcileNote.trim() ? [{
            type: 'other',
            amount: 0,
            note: 'Reconciliation: ' + reconcileNote.trim(),
            addedBy: 'owner',
            addedAt: new Date().toISOString(),
          }] : []),
        ];
        const recAdjTotal = adjustmentsWithReconcile.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const recAdjCash = adjustmentsWithReconcile.filter(a => a.type === 'expense' || a.type === 'credit_to_owner').reduce((sum, a) => sum + Number(a.amount || 0), 0);
        const recFinalCash = expected.expectedCash - recAdjCash;
        const recFinalTotal = expected.expectedTotal - recAdjTotal;

        await updateSettlement(existingSettlement.id, {
          actual_cash: actualCashVal,
          actual_transfer: actualTransferVal,
          adjustments: adjustmentsWithReconcile,
          final_expected_cash: recFinalCash,
          final_expected_total: recFinalTotal,
          final_variance: (actualCashVal + actualTransferVal) - recFinalTotal,
          status: 'reconciled',
          notes: notes.trim(),
          reconciled_at: now,
          reconciled_by: staffIdNum,
          reconciliation_note: reconcileNote.trim(),
          updated_at: now,
        });
      } else {
        await saveSettlement({
          settlement_id: generateSettlementId(),
          staff_id: staffIdNum,
          period_start: period.start,
          period_end: period.end,
          expected_cash: expected.expectedCash,
          actual_cash: actualCashVal,
          expected_transfer: expected.expectedTransfer,
          actual_transfer: actualTransferVal,
          expected_total: expected.expectedTotal,
          adjustments,
          final_expected_cash: finalExpectedCash,
          final_expected_total: finalExpectedTotal,
          final_variance: totalVariance,
          status: 'checked',
          notes: notes.trim(),
          settled_at: now,
          settled_by: staffIdNum,
          created_at: now,
          device_id: '',
        });
        clearSettlementDraft(String(staff.id));
      }
      onSaved?.();
    } catch (e) {
      setError('Failed to save settlement');
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  const t = (en, am) => lang === 'am' ? am : en;
  const readOnly = mode === 'view';

  return (
    <div style={{
      background: '#f9fafb', borderRadius: 12, padding: 16,
      border: '1px solid #e5e7eb',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1f2937', margin: 0 }}>
            {isReconcile
              ? t('Reconcile', 'ማስተካከል') + ' ' + (staff.name || staff.displayName)
              : t('Settle with', 'ከ') + ' ' + (staff.name || staff.displayName)}
          </h3>
          {existingSettlement && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
              background: existingSettlement.status === 'reconciled' ? '#dcfce7' : '#fef3c7',
              color: existingSettlement.status === 'reconciled' ? '#16a34a' : '#d97706',
            }}>
              {existingSettlement.status === 'reconciled' ? t('Reconciled', 'ተስተካክሏል') : t('Checked', 'ተፈትሏል')}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
          {t('Period:', 'ከ')} {period.start ? new Date(period.start).toLocaleDateString() : t('Beginning', 'መጀመሪያ')} → {new Date(period.end).toLocaleDateString()}
          {existingSettlement && ` · ${t('Settled', 'ተቀምጧል')} ${new Date(existingSettlement.settled_at).toLocaleDateString()}`}
        </p>
      </div>

      {/* Expected */}
      <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 8px' }}>
          {t('Expected (from records)', 'የሚጠበቅ')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{t('Cash', 'ጥሬ')}</span>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#1f2937', margin: '2px 0' }}>{fmt(expected.expectedCash)}</p>
          </div>
          <div>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{t('Transfer', 'ዝውውር')}</span>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#1f2937', margin: '2px 0' }}>{fmt(expected.expectedTransfer)}</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 8, paddingTop: 8, textAlign: 'center' }}>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>{t('Total expected', 'ጠቅላላ')}</span>
          <p style={{ fontSize: 20, fontWeight: 950, color: '#1f2937', margin: '2px 0' }}>{fmt(expected.expectedTotal)} ETB</p>
        </div>
      </div>

      {/* Actual inputs */}
      <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 8px' }}>
          {t('Actual (counted together)', 'ትክክለኛው')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>{t('Cash in hand', 'በእጅ ጥሬ')}</span>
            <input type="number" inputMode="decimal" value={actualCash}
              onChange={e => setActualCash(e.target.value)}
              readOnly={readOnly}
              placeholder="0"
              style={{ minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 16, fontWeight: 900, textAlign: 'center', outline: 'none', background: readOnly ? '#f9fafb' : '#fff' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>
              {t('Transfer', 'ዝውውር')}
              <span style={{ fontWeight: 400, color: '#9ca3af' }}> ({t('optional', 'አማራጭ')})</span>
            </span>
            <input type="number" inputMode="decimal" value={actualTransfer}
              onChange={e => setActualTransfer(e.target.value)}
              readOnly={readOnly}
              placeholder="0"
              style={{ minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 16, fontWeight: 900, textAlign: 'center', outline: 'none', background: readOnly ? '#f9fafb' : '#fff' }}
            />
          </label>
        </div>
      </div>

      {/* Variance */}
      {(actualCashVal > 0 || actualTransferVal > 0) && (
        <div style={{
          background: totalVariance === 0 ? '#dcfce7' : '#fef2f2',
          borderRadius: 8, padding: 12, marginBottom: 12, textAlign: 'center',
          border: `1px solid ${totalVariance === 0 ? '#bbf7d0' : '#fecaca'}`,
        }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', margin: 0 }}>
            {t('Variance', 'ልዩነት')}
          </p>
          <p style={{
            fontSize: 22, fontWeight: 950,
            color: totalVariance === 0 ? '#16a34a' : '#dc2626',
            margin: '4px 0 0',
          }}>
            {totalVariance === 0
              ? (lang === 'am' ? 'ተመጣጣኚ ✓' : 'Balanced ✓')
              : `${totalVariance >= 0 ? '+' : ''}${fmt(totalVariance)} ETB`
            }
          </p>
          {totalVariance !== 0 && (
            <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0' }}>
              {t('Cash:', 'ጥሬ:')} {cashVariance >= 0 ? '+' : ''}{fmt(cashVariance)} ·
              {t('Transfer:', 'ዝውውር:')} {String(actualTransferVal - expected.expectedTransfer >= 0 ? '+' : '')}{fmt(actualTransferVal - expected.expectedTransfer)}
            </p>
          )}
        </div>
      )}

      {/* Adjustments */}
      <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 8px' }}>
          {t('Adjustments', 'ማስተካከያ')}
          {!readOnly && <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none' }}> ({t('owner only', 'የባለቤት')})</span>}
        </p>

        {adjustments.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {adjustments.map((adj, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 8px', background: '#f9fafb', borderRadius: 6, marginBottom: 4,
                fontSize: 12,
              }}>
                <div>
                  <span style={{ fontWeight: 800, color: '#374151' }}>
                    {adj.type === 'expense' ? t('Expense', 'ወጪ') :
                     adj.type === 'credit_to_owner' ? t('Credit to owner', 'ለባለቤት ክሬዲት') :
                     adj.type === 'sale' ? t('Sale', 'ሽያጭ') : t('Other', 'ሌላ')}
                  </span>
                  <span style={{ color: '#6b7280', marginLeft: 6 }}>
                    {adj.amount >= 0 ? '+' : ''}{fmt(adj.amount)} · {adj.note}
                  </span>
                </div>
                {!readOnly && (
                  <button onClick={() => handleRemoveAdjustment(i)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        {!readOnly && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)}
              style={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px', outline: 'none' }}
            >
              <option value="expense">{t('Expense', 'ወጪ')}</option>
              <option value="credit_to_owner">{t('Credit to owner', 'ለባለቤት ክሬዲት')}</option>
              <option value="sale">{t('Sale', 'ሽያጭ')}</option>
              <option value="other">{t('Other', 'ሌላ')}</option>
            </select>
            <input type="number" inputMode="decimal" value={adjustmentAmount}
              onChange={e => setAdjustmentAmount(e.target.value)} placeholder="Amount"
              style={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px', width: 80, outline: 'none' }}
            />
            <input type="text" value={adjustmentNote}
              onChange={e => setAdjustmentNote(e.target.value)} placeholder="Note"
              style={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px', flex: 1, minWidth: 100, outline: 'none' }}
            />
            <button onClick={handleAddAdjustment}
              style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >+</button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 12 }}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          readOnly={readOnly}
          placeholder={t('Notes (optional)', 'ማስታወሻ')}
          rows={2}
          style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: readOnly ? '#f9fafb' : '#fff' }}
        />
      </div>

      {/* Reconciliation note (shown when owner starts reconciliation) */}
      {isReconcile && mode === 'reconcile' && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#374151', display: 'block', marginBottom: 4 }}>
            {t('Reconciliation note', 'የማስተካከያ ማስታወሻ')}
          </label>
          <textarea value={reconcileNote} onChange={e => setReconcileNote(e.target.value)}
            placeholder={t('What changed and why?', 'ምን ተለውጧል እና ለምን?')}
            rows={2}
            style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* Error */}
      {error && <p style={{ color: '#dc2626', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>{error}</p>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel}
          style={{ flex: 1, minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
        >{t('Back', 'ተመለስ')}</button>

        {isReconcile && mode === 'view' && existingSettlement?.status === 'checked' && (
          <button onClick={() => setMode('reconcile')}
            style={{ flex: 1, minHeight: 40, border: 'none', borderRadius: 8, background: '#d97706', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
          >{t('Reconcile', 'አስተካክል')}</button>
        )}

        {mode !== 'view' && (
          <button onClick={handleSave} disabled={saving || (actualCashVal === 0 && actualTransferVal === 0)}
            style={{
              flex: 1, minHeight: 40, border: 'none', borderRadius: 8,
              background: saving ? '#9ca3af' : '#1B4332',
              color: '#fff',
              fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >{saving ? t('Saving...', 'በማስቀመጥ ላይ...') : (mode === 'reconcile' ? t('Save Reconciliation', 'ማስተካከያ አስቀምጥ') : t('Save Settlement', 'አስቀምጥ'))}</button>
        )}
      </div>
    </div>
  );
}

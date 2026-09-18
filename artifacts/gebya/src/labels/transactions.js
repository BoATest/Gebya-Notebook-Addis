/**
 * transactions labels — TransactionForm (sub-batched by section).
 *
 * Strings copied verbatim from TransactionForm.jsx — provenance `05fa092`
 * (file untouched since `974292b`, Batch 3a covers L67-97, 160-164, 183).
 * Zero term decisions: every byte is locked; see R2-LABELS-DRAFT.md for
 * the 'ብር'/'birr' inconsistency note (shared.currency.sign).
 */
export const transactions = {
  // ── Type config (header label per entry type) ──────────────────────────
    typeLabel: {
    sale: { en: '+ Sale', am: '+ ሽያጭ' },            // L69, L72 (fallback)
    expense: { en: '− Expense', am: '− ወጪ' },       // L71 (Unicode minus U+2212)
    credit: { en: '↻ Credit', am: '↻ ዱቤ' },        // L70 (Unicode arrow U+21BB)
  },

  // ── Type config (save button text per entry type) ──────────────────────
    saveButton: {
    credit: { en: 'Save Credit', am: 'ዱቤ አስቀምጥ' },   // L94
    expense: { en: 'Save Expense', am: 'ወጪ አስቀምጥ' },  // L96
    sale: { en: 'Save Sale', am: 'ሽያጭ አስቀምጥ' },      // L97
    // L72 fallback (default sale): '+ ሽያጭ / + Sale' — covered by typeLabel.sale
    // L97 fallback (default): 'አስቀምጥ / Save' — separate lock below
  },
  saveButtonDefault: { en: 'Save', am: 'አስቀምጥ' },  // L97 default branch (photos.length===0, not credit/expense)

  // ── Item placeholder + label (branches on type) ────────────────────────
  itemPlaceholder: {
    credit: { en: 'e.g. Abebe...', am: 'ለምሳሌ አበበ…' },  // L84
    expense: { en: 'Add details...', am: 'ዝርዝሩን ይመዝቡ...' },  // L86
    sale: { en: 'Add details...', am: 'ዝርዝሩን ይመዝቡ...' },    // L87 (same bytes as expense)
  },
  itemLabel: {
    credit: { en: 'NAME', am: 'ስም' },                                  // L90
    sale: { en: 'Item / Service (Optional)', am: 'ዕቃ / አገልግሎት (አማራጭ)' },  // L91
  },

  // ── Photo handler error ────────────────────────────────────────────────
  photoLimit: { en: 'You can attach up to 3 photos', am: '3 ፎቶዎች ሙሉ በሙሉ ተያዝዋል' },  // L183

  // ── Payment display label (payment-type selector row) ──────────────────
  paymentType: {
    cash: { en: 'Cash', am: 'ጥሬ' },          // L161
    credit: { en: 'Credit', am: 'ዱቤ' },       // L163
  },
};

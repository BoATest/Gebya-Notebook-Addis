import db from '../db';

function isTransfer(paymentType, paymentProvider) {
  const pt = String(paymentType || '').toLowerCase();
  const pp = String(paymentProvider || '').toLowerCase();
  return ['bank', 'transfer', 'mobile', 'telebirr', 'cbe', 'mpesa'].some(
    key => pt.includes(key) || pp.includes(key)
  );
}

export async function calculateExpected(staffId, periodStart, periodEnd) {
  const all = await db.transactions
    .where('created_at')
    .between(periodStart, periodEnd)
    .toArray();

  const filtered = all.filter(t => {
    const sid = t.actor_staff_member_id;
    return sid !== undefined && sid !== null && String(sid) === String(staffId);
  });

  let expectedCash = 0;
  let expectedTransfer = 0;

  for (const tx of filtered) {
    const amount = Number(tx.amount || 0);
    const transfer = isTransfer(tx.payment_type, tx.payment_provider);
    const isCreditSale = tx.is_credit || String(tx.payment_type || '').toLowerCase() === 'credit';
    const type = String(tx.type || '').toLowerCase();

    if (type === 'sale') {
      if (isCreditSale) {
        // credit sale — no money collected yet
      } else if (transfer) {
        expectedTransfer += amount;
      } else {
        expectedCash += amount;
      }
    } else if (type === 'expense') {
      if (transfer) {
        expectedTransfer -= amount;
      } else {
        expectedCash -= amount;
      }
    } else if (type === 'collection') {
      if (transfer) {
        expectedTransfer += amount;
      } else {
        expectedCash += amount;
      }
    } else if (type === 'credit_to_owner') {
      if (transfer) {
        expectedTransfer -= amount;
      } else {
        expectedCash -= amount;
      }
    }
  }

  const expectedTotal = expectedCash + expectedTransfer;

  return { expectedCash, expectedTransfer, expectedTotal, transactionCount: filtered.length };
}

export async function getLastSettlementPeriod(staffId) {
  try {
    const last = await db.settlements
      .where('staff_id')
      .equals(staffId)
      .last();
    return last ? last.settled_at : null;
  } catch {
    return null;
  }
}

export function generateSettlementId() {
  return 'settle_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export function loadSettlementFromLocalStorage(staffId) {
  try {
    const key = `gebya_settlement_draft_${staffId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSettlementDraft(staffId, draft) {
  try {
    localStorage.setItem(`gebya_settlement_draft_${staffId}`, JSON.stringify(draft));
  } catch { /* ignore */ }
}

export function clearSettlementDraft(staffId) {
  try {
    localStorage.removeItem(`gebya_settlement_draft_${staffId}`);
  } catch { /* ignore */ }
}

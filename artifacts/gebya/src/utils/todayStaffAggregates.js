import db from '../db';
import { startOfLocalDay } from './reportSelectors';

// Computes per-staff sales/cash/transfer aggregates and the raw transaction map
// for the current local day. Shared by StaffPage and StaffActivityFeed so the
// store is only written from one source of truth.
export async function computeTodayStaffAggregates() {
  const todayStart = startOfLocalDay();
  const todayEnd = todayStart + 86400000;
  const txns = await db.transactions
    .where('created_at')
    .between(todayStart, todayEnd)
    .toArray()
    .then((rows) => rows.filter((t) => !t.deletedAt));

  const salesMap = {};
  const txnMap = {};
  for (const txn of txns) {
    if (txn.type !== 'sale') continue;
    const staffId = txn.actor_staff_member_id;
    if (!staffId) continue;
    if (!salesMap[staffId]) {
      salesMap[staffId] = { count: 0, total: 0, cashTotal: 0, transferTotal: 0 };
    }
    if (!txnMap[staffId]) txnMap[staffId] = [];
    salesMap[staffId].count += 1;
    salesMap[staffId].total += Number(txn.amount || 0);
    if (txn.payment_type === 'transfer' || txn.payment_type === 'bank') {
      salesMap[staffId].transferTotal += Number(txn.amount || 0);
    } else if (txn.is_credit || String(txn.payment_type || '').toLowerCase() === 'credit') {
      // Credit sale — money not yet collected, so exclude from "cash collected"
      // to keep the staff's reported cash consistent with calculateExpected().
    } else {
      salesMap[staffId].cashTotal += Number(txn.amount || 0);
    }
    txnMap[staffId].push(txn);
  }
  return { salesMap, txnMap };
}

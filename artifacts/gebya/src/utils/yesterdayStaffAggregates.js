import db from '../db';
import { startOfLocalDay } from './reportSelectors';

export async function computeYesterdayStaffAggregates() {
  const yesterdayStart = startOfLocalDay() - 86400000;
  const yesterdayEnd = yesterdayStart + 86400000;
  const txns = await db.transactions
    .where('created_at')
    .between(yesterdayStart, yesterdayEnd)
    .toArray()
    .then((rows) => rows.filter((t) => !t.deletedAt));

  const salesMap = {};
  for (const txn of txns) {
    if (txn.type !== 'sale') continue;
    const staffId = txn.actor_staff_member_id;
    if (!staffId) continue;
    if (!salesMap[staffId]) {
      salesMap[staffId] = { count: 0, total: 0, cashTotal: 0, transferTotal: 0 };
    }
    salesMap[staffId].count += 1;
    salesMap[staffId].total += Number(txn.amount || 0);
    if (txn.payment_type === 'transfer' || txn.payment_type === 'bank') {
      salesMap[staffId].transferTotal += Number(txn.amount || 0);
    } else {
      salesMap[staffId].cashTotal += Number(txn.amount || 0);
    }
  }
  return salesMap;
}
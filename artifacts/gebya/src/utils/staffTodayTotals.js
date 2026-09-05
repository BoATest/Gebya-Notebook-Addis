/**
 * Staff "running total" helpers (Phase 8c)
 *
 * Pure functions — no DB, no React. Compute a staff member's live
 * today-totals from an already-loaded transactions array.
 */

/**
 * @param {Array} todayTransactions - today's transactions (already day-filtered)
 * @param {string|number|null} staffMemberId - the staff member's id, or null for the owner
 * @returns {{ salesCount: number, salesTotal: number, creditCount: number }}
 *
 * salesCount  = all sale transactions recorded by this actor (incl. credit)
 * salesTotal  = money actually collected (cash + transfer, credit excluded)
 * creditCount = credit sales given out (money not yet collected)
 */
export function computeStaffTodayTotals(todayTransactions, staffMemberId) {
  const list = Array.isArray(todayTransactions) ? todayTransactions : [];
  let salesCount = 0;
  let salesTotal = 0;
  let creditCount = 0;

  for (const tx of list) {
    if (String(tx?.type || '').toLowerCase() !== 'sale') continue;
    if (tx?.deletedAt) continue;

    const txStaffId = tx?.actor_staff_member_id;
    if (staffMemberId == null) {
      // owner: transactions stamped with no staff id
      if (txStaffId != null) continue;
    } else if (String(txStaffId) !== String(staffMemberId)) {
      continue;
    }

    salesCount += 1;
    const isCredit = tx.is_credit || String(tx.payment_type || '').toLowerCase() === 'credit';
    if (isCredit) {
      creditCount += 1;
    } else {
      salesTotal += Number(tx.amount) || 0;
    }
  }

  return { salesCount, salesTotal, creditCount };
}

/**
 * Per-staff breakdown for the owner's Today view.
 * Returns one entry per staff member found in today's transactions,
 * plus the owner's own totals under key 'owner'.
 */
export function computeTodayTotalsByStaff(todayTransactions, staffMembers = []) {
  const result = [];
  const seen = new Set();

  for (const member of staffMembers) {
    if (!member || member.active === false) continue;
    const totals = computeStaffTodayTotals(todayTransactions, member.id);
    seen.add(String(member.id));
    result.push({ staffId: member.id, name: member.display_name || 'Staff', ...totals });
  }

  const ownerTotals = computeStaffTodayTotals(todayTransactions, null);
  // count owner credit sales separately
  let ownerCredit = 0;
  for (const tx of (todayTransactions || [])) {
    if (String(tx?.type || '').toLowerCase() !== 'sale' || tx?.deletedAt) continue;
    if (tx?.actor_staff_member_id != null) continue;
    if (tx.is_credit || String(tx.payment_type || '').toLowerCase() === 'credit') ownerCredit += 1;
  }

  return { byStaff: result, owner: { ...ownerTotals, creditCount: ownerCredit }, seenStaffIds: seen };
}

export default computeStaffTodayTotals;

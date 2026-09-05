/**
 * Settlement Items Aggregation
 *
 * Pure helper: aggregates the item lines from a list of sale transactions
 * into a per-item breakdown for the settlement "Items sold" section.
 *
 * No DB access, no React — safe to unit test.
 *
 * Input transactions are expected to have:
 *   items[]: [{ name, qty, unit_price, line_total, ... }]
 *   (shape produced by useSmartSaleRows.buildItemsArray)
 * Transactions without an items[] array (simple sales) contribute nothing.
 */

/**
 * @param {Array} transactions - sale transactions for the settlement period
 * @returns {{
 *   items: Array<{ name: string, qty: number, unitPrice: number, lineTotal: number, count: number }>,
 *   totalQty: number,
 *   totalAmount: number,
 *   transactionCount: number
 * }}
 */
export function aggregateSettlementItems(transactions) {
  const list = Array.isArray(transactions) ? transactions : [];
  const byName = new Map();
  let totalQty = 0;
  let totalAmount = 0;
  let transactionCount = 0;

  for (const tx of list) {
    const items = Array.isArray(tx?.items) ? tx.items : [];
    if (items.length === 0) continue;
    transactionCount += 1;

    for (const raw of items) {
      const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
      if (!name) continue;

      const qty = Number(raw?.qty) || 0;
      const unitPrice = Number(raw?.unit_price) || 0;
      const lineTotal = Number(raw?.line_total) || qty * unitPrice;
      if (qty === 0 && lineTotal === 0) continue;

      const key = name.toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        existing.qty += qty;
        existing.lineTotal += lineTotal;
        existing.count += 1;
        // keep the most recently used unit price (prices can change)
        if (unitPrice > 0) existing.unitPrice = unitPrice;
      } else {
        byName.set(key, {
          name,
          qty,
          unitPrice: unitPrice || (qty > 0 ? lineTotal / qty : 0),
          lineTotal,
          count: 1,
        });
      }
      totalQty += qty;
      totalAmount += lineTotal;
    }
  }

  // sort by line value descending — highest-value items first
  const items = [...byName.values()].sort((a, b) => b.lineTotal - a.lineTotal);

  return { items, totalQty, totalAmount, transactionCount };
}

export default aggregateSettlementItems;

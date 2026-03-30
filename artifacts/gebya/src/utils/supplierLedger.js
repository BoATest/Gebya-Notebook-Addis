export const SUPPLIER_TRANSACTION_TYPES = Object.freeze({
  PURCHASE_ADD: 'purchase_add',
  PAYMENT: 'supplier_payment',
});

export function isValidSupplierTransactionType(value) {
  return value === SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD || value === SUPPLIER_TRANSACTION_TYPES.PAYMENT;
}

export function sortSupplierTransactions(items = []) {
  return [...items].sort((a, b) => b.created_at - a.created_at);
}

export function getSupplierBalance(items = []) {
  return items.reduce((sum, item) => {
    if (item.type === SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD) return sum + (item.amount || 0);
    if (item.type === SUPPLIER_TRANSACTION_TYPES.PAYMENT) return sum - (item.amount || 0);
    return sum;
  }, 0);
}

export function buildSupplierSummaries(suppliers = [], supplierTransactions = []) {
  const txBySupplier = supplierTransactions.reduce((acc, item) => {
    if (!acc[item.supplier_id]) acc[item.supplier_id] = [];
    acc[item.supplier_id].push(item);
    return acc;
  }, {});

  return suppliers
    .map((supplier) => {
      const items = sortSupplierTransactions(txBySupplier[supplier.id] || []);
      const balance = getSupplierBalance(items);
      const lastActivityAt = items[0]?.created_at || supplier.updated_at || supplier.created_at || 0;

      return {
        ...supplier,
        transactions: items,
        balance,
        transaction_count: items.length,
        last_activity_at: lastActivityAt,
      };
    })
    .sort((a, b) => {
      if ((b.balance || 0) !== (a.balance || 0)) return (b.balance || 0) - (a.balance || 0);
      return (b.last_activity_at || 0) - (a.last_activity_at || 0);
    });
}

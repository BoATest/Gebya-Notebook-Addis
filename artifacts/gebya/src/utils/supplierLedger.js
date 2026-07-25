export const SUPPLIER_TRANSACTION_TYPES = Object.freeze({
  PURCHASE_ADD: 'purchase_add',
  PAYMENT: 'supplier_payment',
});

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtCsvTimestamp(ts) {
  if (!ts) return ['', ''];
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return ['', ''];
  const date = d.toISOString().split('T')[0];
  const time = d.toTimeString().split(' ')[0];
  return [date, time];
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function buildSupplierReport({ shopName = 'Shop', suppliers = [], supplierTransactions = [] }) {
  const totalPurchases = suppliers.reduce((sum, s) => {
    const purchases = (s.transactions || []).filter(tx => tx.type === SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD);
    return sum + purchases.reduce((a, t) => a + (Number(t.amount) || 0), 0);
  }, 0);
  const totalPayments = suppliers.reduce((sum, s) => {
    const payments = (s.transactions || []).filter(tx => tx.type === SUPPLIER_TRANSACTION_TYPES.PAYMENT);
    return sum + payments.reduce((a, t) => a + (Number(t.amount) || 0), 0);
  }, 0);
  const totalOwed = suppliers.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);

  return {
    report_type: 'supplier_report',
    generated_at: new Date().toISOString(),
    shop: { name: shopName },
    summary: {
      total_suppliers: suppliers.length,
      total_purchases_birr: totalPurchases,
      total_payments_birr: totalPayments,
      total_owed_birr: totalOwed,
    },
    suppliers: suppliers.map(s => ({
      id: s.id,
      name: s.display_name,
      phone: s.phone_number || null,
      outstanding_birr: Number(s.balance) || 0,
      transaction_count: (s.transactions || []).length,
    })),
  };
}

export function exportSupplierReportCsv(report, supplierTransactions = [], filename = 'supplier-report') {
  const lines = [];
  lines.push('\uFEFFSupplier Report');
  lines.push(`Shop,${escapeCsv(report.shop?.name)}`);
  lines.push(`Generated,${report.generated_at || ''}`);
  lines.push('');

  const s = report.summary || {};
  lines.push('=== Summary ===');
  lines.push(`Total Suppliers,${s.total_suppliers ?? 0}`);
  lines.push(`Total Purchases (birr),${s.total_purchases_birr ?? 0}`);
  lines.push(`Total Payments (birr),${s.total_payments_birr ?? 0}`);
  lines.push(`Total Outstanding (birr),${s.total_owed_birr ?? 0}`);
  lines.push('');

  if (report.suppliers && report.suppliers.length > 0) {
    const supplierMap = {};
    for (const s of report.suppliers) {
      if (s.id != null) supplierMap[s.id] = s.name;
    }

    const supplierTxns = supplierTransactions
      .filter(t => t.supplier_id != null && supplierMap[t.supplier_id])
      .sort((a, b) => {
        if ((a.supplier_id || 0) !== (b.supplier_id || 0)) return (a.supplier_id || 0) - (b.supplier_id || 0);
        return (a.created_at || 0) - (b.created_at || 0);
      });

    if (supplierTxns.length > 0) {
      lines.push('=== Transaction History ===');
      lines.push('Supplier,Date,Time,Type,Item,Amount (birr),Running Balance (birr)');

      let lastSupplierId = null;
      let runningBalance = 0;

      for (const tx of supplierTxns) {
        if (tx.supplier_id !== lastSupplierId) {
          runningBalance = 0;
          lastSupplierId = tx.supplier_id;
        }

        const [date, time] = fmtCsvTimestamp(tx.created_at);
        const type = tx.type === SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD ? 'Purchase' : 'Payment';
        const amount = Number(tx.amount) || 0;
        const signedAmount = type === 'Purchase' ? amount : -amount;
        runningBalance += signedAmount;

        const itemNote = tx.item_name || tx.note || '';

        lines.push([
          escapeCsv(supplierMap[tx.supplier_id]),
          date,
          time,
          type,
          escapeCsv(itemNote),
          signedAmount,
          runningBalance,
        ].join(','));
      }
    }
  }

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const ts = new Date().toISOString().split('T')[0];
  const file = `${filename}-${ts}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}

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

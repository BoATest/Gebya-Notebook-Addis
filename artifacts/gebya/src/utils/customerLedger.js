function compareNumericDesc(left, right) {
  return (Number(right) || 0) - (Number(left) || 0);
}

export function compareCustomerTransactions(a = {}, b = {}) {
  return compareNumericDesc(a.created_at, b.created_at)
    || compareNumericDesc(a.updated_at, b.updated_at)
    || compareNumericDesc(a.id, b.id);
}

export function sortCustomerTransactions(items = []) {
  return [...items].sort(compareCustomerTransactions);
}

export function insertCustomerTransaction(items = [], nextItem) {
  return sortCustomerTransactions(nextItem ? [nextItem, ...items] : items);
}

export function getCustomerBalance(items = []) {
  return items.reduce((sum, item) => {
    if (item.type === 'credit_add') return sum + (item.amount || 0);
    if (item.type === 'payment') return sum - (item.amount || 0);
    if (item.type === 'reversal') return sum - (item.amount || 0);
    return sum;
  }, 0);
}

export function getCustomerLatestDueDate(items = []) {
  return items
    .filter(item => item.type === 'credit_add' && item.due_date)
    .map(item => item.due_date)
    .sort((a, b) => b - a)[0] || null;
}

export function buildCustomerSummaries(customers = [], customerTransactions = []) {
  const txByCustomer = customerTransactions.reduce((acc, item) => {
    if (!acc[item.customer_id]) acc[item.customer_id] = [];
    acc[item.customer_id].push(item);
    return acc;
  }, {});

  return customers
    .map(customer => {
      const items = sortCustomerTransactions(txByCustomer[customer.id] || []);
      const balance = getCustomerBalance(items);
      const lastActivityAt = items[0]?.created_at || customer.updated_at || customer.created_at || 0;

      return {
        ...customer,
        transactions: items,
        balance,
        transaction_count: items.length,
        last_activity_at: lastActivityAt,
        latest_due_date: getCustomerLatestDueDate(items),
      };
    })
    .sort((a, b) => {
      if ((b.balance || 0) !== (a.balance || 0)) return (b.balance || 0) - (a.balance || 0);
      if ((b.last_activity_at || 0) !== (a.last_activity_at || 0)) return (b.last_activity_at || 0) - (a.last_activity_at || 0);
      return String(a.display_name || '').localeCompare(String(b.display_name || ''))
        || compareNumericDesc(a.id, b.id);
    });
}

/**
 * Server-side integrity check: validates that the local client-computed balance
 * matches the authoritative server-side recomputation from the immutable
 * transaction log. Returns { match, serverBalance, localBalance } or null on error.
 */
export async function validateBalanceIntegrity(customerId, localBalance) {
  try {
    const SYNC_API_BASE = import.meta.env.VITE_SYNC_API_URL || '/api';
    const tokenRow = await import('../db').then(m => m.default.settings.get('gebya_auth_token'));
    const token = tokenRow?.value;
    if (!token) return null;

    const res = await fetch(`${SYNC_API_BASE}/sync/balance-check/${customerId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok) return null;

    return {
      match: Math.abs(data.balance - localBalance) < 0.01,
      serverBalance: data.balance,
      localBalance,
      transactionCount: data.transaction_count,
    };
  } catch {
    return null;
  }
}

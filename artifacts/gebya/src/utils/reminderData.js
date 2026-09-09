/**
 * Personalized Daily Reminder Data Builder
 *
 * Builds a personalized reminder payload from IndexedDB data.
 * Replaces the hardcoded "Don't forget to record today's sales" message
 * with actual business data: today's sales, overdue payments, etc.
 *
 * Called by the service worker or client to build the notification content.
 */

export async function buildReminderPayload(db) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;

    // Query today's transactions from IndexedDB
    const todayTransactions = await db.transactions
      .where('created_at')
      .between(todayStart, todayEnd)
      .toArray();

    const salesToday = todayTransactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const creditToday = todayTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Query overdue customers
    const customers = await db.customers.toArray();
    const overdueCustomers = customers.filter(c => {
      const balance = Number(c.balance) || 0;
      const dueDate = c.due_date;
      if (balance <= 0 || !dueDate) return false;
      return dueDate < todayStart;
    });

    const totalOverdue = overdueCustomers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

    // Build message
    const parts = [];
    if (salesToday > 0) {
      parts.push(`💰 ${formatCurrency(salesToday)} sales today`);
    }
    if (creditToday > 0) {
      parts.push(`👥 ${formatCurrency(creditToday)} on credit`);
    }
    if (overdueCustomers.length > 0) {
      parts.push(`⏰ ${overdueCustomers.length} overdue (${formatCurrency(totalOverdue)})`);
    }

    if (parts.length === 0) {
      return {
        body: "No activity yet today. Record your first sale! ዛሬውን ሽያጭ ይመዝግቡ።",
        hasData: false,
      };
    }

    return {
      body: parts.join(' · '),
      hasData: true,
      salesToday,
      creditToday,
      overdueCount: overdueCustomers.length,
      totalOverdue,
    };
  } catch {
    // Fallback to generic message
    return {
      body: "Don't forget to record today's sales. ዛሬውን ሽያጭ ይመዝግቡ።",
      hasData: false,
    };
  }
}

function formatCurrency(amount) {
  return `${Math.round(amount).toLocaleString()} ETB`;
}

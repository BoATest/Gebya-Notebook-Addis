/**
 * Monetization infrastructure — plan_tier (free/plus), entitlement checks,
 * and impact metrics for future grant/NBE/DFI conversations.
 *
 * No paywall, no payment gateway, no bank-facing API.
 */
import { db } from '../db';

export const PLAN_TIERS = {
  FREE: 'free',
  PLUS: 'plus',
};

const ENTITLEMENTS = {
  [PLAN_TIERS.FREE]: {
    max_staff: 3,
    max_transactions_per_month: 500,
    advanced_reports: false,
    multi_shop: false,
    priority_support: false,
  },
  [PLAN_TIERS.PLUS]: {
    max_staff: Infinity,
    max_transactions_per_month: Infinity,
    advanced_reports: true,
    multi_shop: true,
    priority_support: true,
  },
};

/**
 * Get the current shop's plan tier.
 */
export async function getPlanTier() {
  try {
    const row = await db.settings.get('plan_tier');
    return row?.value || PLAN_TIERS.FREE;
  } catch {
    return PLAN_TIERS.FREE;
  }
}

/**
 * Set the shop's plan tier.
 */
export async function setPlanTier(tier) {
  if (!Object.values(PLAN_TIERS).includes(tier)) return;
  await db.settings.put({ key: 'plan_tier', value: tier });
}

/**
 * Check if the shop has a specific entitlement.
 * Usage: const canExport = await hasEntitlement('advanced_reports');
 */
export async function hasEntitlement(entitlementName) {
  const tier = await getPlanTier();
  const tierEntitlements = ENTITLEMENTS[tier] || ENTITLEMENTS[PLAN_TIERS.FREE];
  return tierEntitlements[entitlementName] === true || tierEntitlements[entitlementName] === Infinity;
}

/**
 * Get all entitlements for the current plan.
 */
export async function getCurrentEntitlements() {
  const tier = await getPlanTier();
  return { tier, entitlements: ENTITLEMENTS[tier] || ENTITLEMENTS[PLAN_TIERS.FREE] };
}

// --- Impact metrics (read-only, for future grant/NBE/DFI conversations) ---

/**
 * Compute aggregate impact metrics across all shops.
 * This is a read-only view — no mutations.
 */
export async function computeImpactMetrics() {
  const transactions = await db.transactions.toArray();
  const customers = await db.customers.toArray();
  const customerTransactions = await db.customer_transactions.toArray();
  const staffMembers = await db.staff_members.toArray();

  // Shops onboarded: always 1 for single-shop PWA (but structured for future multi-shop)
  const shopsOnboarded = 1;

  // Prior-paper-only %: estimated from first_used_date
  const analytics = await db.analytics.toArray();
  const firstUsed = analytics.find((a) => a.key === 'first_used_date');
  const firstUsedDate = firstUsed?.value ? new Date(firstUsed.value) : new Date();
  const monthsActive = Math.max(1, Math.ceil((Date.now() - firstUsedDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));

  // Transaction volume
  const totalTransactions = transactions.length;
  const totalSales = transactions.filter((t) => t.type === 'sale').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // Credit tracked
  const totalCreditExtended = customerTransactions
    .filter((t) => t.type === 'credit_add')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalCreditRepaid = customerTransactions
    .filter((t) => t.type === 'payment')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return {
    shops_onboarded: shopsOnboarded,
    months_active: monthsActive,
    total_transactions: totalTransactions,
    monthly_transaction_rate: Math.round(totalTransactions / monthsActive),
    total_sales_birr: totalSales,
    total_expenses_birr: totalExpenses,
    total_credit_extended_birr: totalCreditExtended,
    total_credit_repaid_birr: totalCreditRepaid,
    credit_recovery_rate: totalCreditExtended > 0
      ? Math.round((totalCreditRepaid / totalCreditExtended) * 100)
      : 0,
    unique_customers: new Set(customerTransactions.map((t) => t.customer_id)).size,
    active_staff: staffMembers.filter((s) => s.active !== false).length,
    computed_at: Date.now(),
  };
}

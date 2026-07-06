/**
 * Behavioral Trust Score — two separate scores per shop:
 *
 * 1. data_integrity_score: device consistency, edit frequency, photo attached, actor clarity
 * 2. business_health_score: customer repayment consistency, credit health, revenue stability
 *
 * Both are versioned (score_version), config-driven (not hardcoded), and store raw factor inputs.
 * Label: "behavioral consistency signal, unvalidated"
 */
import { db } from '../db';

const SCORE_VERSION = 1;

const DEFAULT_WEIGHTS = {
  data_integrity: {
    device_consistency: 0.25,
    edit_frequency: 0.20,
    photo_attached: 0.25,
    actor_clarity: 0.30,
  },
  business_health: {
    repayment_consistency: 0.40,
    credit_health: 0.30,
    revenue_stability: 0.30,
  },
};

/**
 * Load scoring weights from settings, falling back to defaults.
 */
async function loadWeights() {
  try {
    const row = await db.settings.get('trust_score_weights');
    return row?.value || DEFAULT_WEIGHTS;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

/**
 * Compute data_integrity_score for a shop.
 * Raw factors are stored for later recalibration.
 */
async function computeDataIntegrity(shopId) {
  const weights = (await loadWeights()).data_integrity;
  const transactions = await db.transactions.toArray();

  if (transactions.length === 0) {
    return { score: 0, factors: {}, weight_version: SCORE_VERSION };
  }

  // Device consistency: % of transactions with a device_id
  const withDevice = transactions.filter((t) => t.device_id).length;
  const deviceConsistency = withDevice / transactions.length;

  // Edit frequency: inverse of edit ratio (fewer edits = higher score)
  const edited = transactions.filter((t) => t.was_edited).length;
  const editRatio = edited / transactions.length;
  const editFrequency = Math.max(0, 1 - editRatio * 2); // 50%+ edits → 0

  // Photo attached: % of transactions with at least one photo
  const withPhoto = transactions.filter((t) => t.photo_url || t.photo_proof_urls?.length).length;
  const photoAttached = withPhoto / Math.max(1, transactions.length);

  // Actor clarity: % of transactions with a known actor
  const withActor = transactions.filter((t) => t.actor_staff_member_id || t.actor_name_snapshot).length;
  const actorClarity = withActor / transactions.length;

  const factors = {
    device_consistency: deviceConsistency,
    edit_frequency: editFrequency,
    photo_attached: photoAttached,
    actor_clarity: actorClarity,
  };

  const score = Math.round(
    (factors.device_consistency * (weights.device_consistency || 0.25) +
      factors.edit_frequency * (weights.edit_frequency || 0.20) +
      factors.photo_attached * (weights.photo_attached || 0.25) +
      factors.actor_clarity * (weights.actor_clarity || 0.30)) *
    100
  );

  return { score: Math.min(100, Math.max(0, score)), factors, weight_version: SCORE_VERSION };
}

/**
 * Compute business_health_score for a shop.
 * Includes customer repayment consistency as a primary factor.
 */
async function computeBusinessHealth(shopId) {
  const weights = (await loadWeights()).business_health;
  const customerTransactions = await db.customer_transactions.toArray();
  const customers = await db.customers.toArray();

  if (customerTransactions.length === 0) {
    return { score: 0, factors: {}, weight_version: SCORE_VERSION };
  }

  // Repayment consistency: what % of credit customers actually repay on time?
  const creditTxs = customerTransactions.filter((t) => t.type === 'credit_add');
  const payments = customerTransactions.filter((t) => t.type === 'payment');

  let repaymentConsistency = 0;
  if (creditTxs.length > 0) {
    const customersWithCredit = new Set(creditTxs.map((t) => t.customer_id));
    let onTimeCount = 0;
    let totalCreditCustomers = 0;

    for (const custId of customersWithCredit) {
      totalCreditCustomers++;
      const custCredits = creditTxs.filter((t) => t.customer_id === custId);
      const custPayments = payments.filter((t) => t.customer_id === custId);
      const totalCredit = custCredits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const totalPaid = custPayments.reduce((s, t) => s + (Number(t.amount) || 0), 0);

      // Customer is "on time" if they've paid >= 50% of their credit
      if (totalCredit > 0 && totalPaid / totalCredit >= 0.5) {
        onTimeCount++;
      }
    }
    repaymentConsistency = totalCreditCustomers > 0 ? onTimeCount / totalCreditCustomers : 0;
  }

  // Credit health: ratio of outstanding credit to total credit extended
  const totalCredit = creditTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalPaid = payments.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const creditHealth = totalCredit > 0 ? Math.min(1, totalPaid / totalCredit) : 1;

  // Revenue stability: coefficient of variation of daily revenue (lower = more stable)
  const salesTxs = await db.transactions.where('type').equals('sale').toArray();
  let revenueStability = 1;
  if (salesTxs.length > 7) {
    const dailyRevenue = {};
    for (const t of salesTxs) {
      const day = new Date(t.created_at).toISOString().split('T')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + (Number(t.amount) || 0);
    }
    const values = Object.values(dailyRevenue);
    if (values.length > 1) {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
      revenueStability = Math.max(0, 1 - Math.min(1, cv)); // high CV → low stability
    }
  }

  const factors = {
    repayment_consistency: repaymentConsistency,
    credit_health: creditHealth,
    revenue_stability: revenueStability,
  };

  const score = Math.round(
    (factors.repayment_consistency * (weights.repayment_consistency || 0.40) +
      factors.credit_health * (weights.credit_health || 0.30) +
      factors.revenue_stability * (weights.revenue_stability || 0.30)) *
    100
  );

  return { score: Math.min(100, Math.max(0, score)), factors, weight_version: SCORE_VERSION };
}

/**
 * Compute and store both trust scores for a shop.
 */
export async function computeAndStoreTrustScores(shopId) {
  const [di, bh] = await Promise.all([
    computeDataIntegrity(shopId),
    computeBusinessHealth(shopId),
  ]);

  const now = Date.now();
  const record = {
    shop_id: shopId,
    computed_at: now,
    score_version: SCORE_VERSION,
    data_integrity_score: di.score,
    data_integrity_factors: di.factors,
    business_health_score: bh.score,
    business_health_factors: bh.factors,
  };

  // Store in analytics table
  await db.settings.put({
    key: `trust_score_${shopId}`,
    value: record,
  });

  return record;
}

/**
 * Get the last computed trust scores for a shop.
 */
export async function getTrustScores(shopId) {
  try {
    const row = await db.settings.get(`trust_score_${shopId}`);
    return row?.value || null;
  } catch {
    return null;
  }
}

/**
 * Find customers with 60+ days overdue and no repayment pattern.
 * This is the "internal-only" flag for the shop owner's credit view.
 */
export async function getOverdueCustomerFlags() {
  const customers = await db.customers.toArray();
  const customerTransactions = await db.customer_transactions.toArray();
  const now = Date.now();
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;

  const flags = [];

  for (const customer of customers) {
    const credits = customerTransactions.filter(
      (t) => t.customer_id === customer.id && t.type === 'credit_add'
    );
    const payments = customerTransactions.filter(
      (t) => t.customer_id === customer.id && t.type === 'payment'
    );

    if (credits.length === 0) continue;

    const totalCredit = credits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalPaid = payments.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const outstanding = totalCredit - totalPaid;

    if (outstanding <= 0) continue;

    // Find oldest unpaid credit
    const oldestUnpaid = credits
      .filter((c) => {
        const creditId = c.id;
        const paidForCredit = payments
          .filter((p) => p.reference_code === String(creditId) || p.customer_id === c.customer_id)
          .reduce((s, p) => s + (Number(p.amount) || 0), 0);
        return paidForCredit < (Number(c.amount) || 0);
      })
      .sort((a, b) => (a.created_at || 0) - (b.created_at || 0))[0];

    if (!oldestUnpaid) continue;

    const daysSince = now - (oldestUnpaid.created_at || 0);
    if (daysSince >= SIXTY_DAYS) {
      const lastPayment = payments
        .filter((p) => p.customer_id === customer.id)
        .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];

      const daysSinceLastPayment = lastPayment
        ? now - (lastPayment.created_at || 0)
        : daysSince;

      flags.push({
        customer_id: customer.id,
        display_name: customer.display_name,
        outstanding_amount: outstanding,
        oldest_unpaid_days: Math.floor(daysSince / (24 * 60 * 60 * 1000)),
        days_since_last_payment: Math.floor(daysSinceLastPayment / (24 * 60 * 60 * 1000)),
        has_recent_payment: daysSinceLastPayment < SIXTY_DAYS,
        risk_level: daysSinceLastPayment >= SIXTY_DAYS ? 'high' : 'medium',
      });
    }
  }

  return flags.sort((a, b) => b.outstanding_amount - a.outstanding_amount);
}

import assert from 'node:assert/strict';

import { buildCustomerSummaries, getCustomerBalance, sortCustomerTransactions } from '../utils/customerLedger.js';
import { fifoAllocatePayment, normalizeCustomerDraft, normalizeCustomerTransactionDraft } from '../utils/customerLedgerMutations.js';
import { buildSupplierSummaries, getSupplierBalance, SUPPLIER_TRANSACTION_TYPES } from '../utils/supplierLedger.js';
import { CUSTOMER_TRANSACTION_TYPES } from '../utils/customerTransactionTypes.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('customer credit increases balance correctly', () => {
  const balance = getCustomerBalance([
    { type: 'credit_add', amount: 250 },
  ]);

  assert.equal(balance, 250);
});

runTest('customer payment reduces balance correctly', () => {
  const balance = getCustomerBalance([
    { type: 'credit_add', amount: 250 },
    { type: 'payment', amount: 80 },
  ]);

  assert.equal(balance, 170);
});

runTest('customer summary balance is credits minus payments regardless of order', () => {
  const customers = [
    { id: 1, display_name: 'Almaz', created_at: 1000, updated_at: 1000 },
  ];

  const transactions = [
    { customer_id: 1, type: 'payment', amount: 40, created_at: 3000, due_date: null },
    { customer_id: 1, type: 'credit_add', amount: 150, created_at: 1000, due_date: 9000 },
    { customer_id: 1, type: 'credit_add', amount: 90, created_at: 2000, due_date: null },
  ];

  const [summary] = buildCustomerSummaries(customers, transactions);

  assert.equal(summary.balance, 200);
  assert.equal(summary.transaction_count, 3);
  assert.equal(summary.last_activity_at, 3000);
  assert.equal(summary.latest_due_date, 9000);
});

runTest('unknown customer transaction types do not change balance', () => {
  const balance = getCustomerBalance([
    { type: 'credit_add', amount: 120 },
    { type: 'note_only', amount: 9999 },
    { type: 'payment', amount: 20 },
  ]);

  assert.equal(balance, 100);
});

runTest('customer transactions sort deterministically when timestamps match', () => {
  const sorted = sortCustomerTransactions([
    { id: 1, created_at: 1000, updated_at: 1000 },
    { id: 3, created_at: 1000, updated_at: 1000 },
    { id: 2, created_at: 1000, updated_at: 1200 },
  ]);

  assert.deepEqual(sorted.map((entry) => entry.id), [2, 3, 1]);
});

runTest('customer draft keeps only required identifier and trims optional fields', () => {
  const customer = normalizeCustomerDraft({
    display_name: '  Almaz  ',
    note: '  regular  ',
    phone_number: ' 0911 ',
    telegram_username: '',
    telegram_notify_enabled: true,
  });

  assert.deepEqual(customer, {
    display_name: 'Almaz',
    note: 'regular',
    phone_number: '0911',
    telegram_username: null,
    telegram_notify_enabled: false,
  });
});

runTest('customer transaction draft accepts valid credit payload and trims note', () => {
  const transaction = normalizeCustomerTransactionDraft({
    customer_id: 5,
    type: CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD,
    amount: '250',
    item_note: '  Sugar  ',
    due_date: 1700000000000,
  });

  assert.deepEqual(transaction, {
    customer_id: 5,
    type: CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD,
    amount: 250,
    item_note: 'Sugar',
    due_date: 1700000000000,
    payment_method: 'cash',
    payment_provider: null,
  });
});

runTest('customer transaction draft rejects invalid payloads safely', () => {
  assert.equal(normalizeCustomerTransactionDraft({
    customer_id: 0,
    type: CUSTOMER_TRANSACTION_TYPES.PAYMENT,
    amount: 100,
  }), null);

  assert.equal(normalizeCustomerTransactionDraft({
    customer_id: 1,
    type: CUSTOMER_TRANSACTION_TYPES.PAYMENT,
    amount: 0,
  }), null);
});

runTest('supplier purchase increases balance owed', () => {
  const balance = getSupplierBalance([
    { type: SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD, amount: 500 },
  ]);

  assert.equal(balance, 500);
});

runTest('supplier payment reduces balance owed', () => {
  const balance = getSupplierBalance([
    { type: SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD, amount: 500 },
    { type: SUPPLIER_TRANSACTION_TYPES.PAYMENT, amount: 125 },
  ]);

  assert.equal(balance, 375);
});

runTest('supplier summary balance is stable regardless of transaction order', () => {
  const suppliers = [
    { id: 7, display_name: 'Abebe Wholesale', created_at: 1000, updated_at: 1000 },
  ];

  const transactions = [
    { supplier_id: 7, type: SUPPLIER_TRANSACTION_TYPES.PAYMENT, amount: 70, created_at: 3000 },
    { supplier_id: 7, type: SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD, amount: 120, created_at: 1000 },
    { supplier_id: 7, type: SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD, amount: 80, created_at: 2000 },
  ];

  const [summary] = buildSupplierSummaries(suppliers, transactions);

  assert.equal(summary.balance, 130);
  assert.equal(summary.transaction_count, 3);
  assert.equal(summary.last_activity_at, 3000);
});

runTest('unknown supplier transaction types do not change balance', () => {
  const balance = getSupplierBalance([
    { type: SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD, amount: 300 },
    { type: 'ignored_adjustment', amount: 1000 },
    { type: SUPPLIER_TRANSACTION_TYPES.PAYMENT, amount: 50 },
  ]);

  assert.equal(balance, 250);
});

// ─── FIFO allocation tests ─────────────────────────────────────────
runTest('fifo allocates single payment to oldest credit first', () => {
  const credits = [
    { id: 1, amount: 200, paid_amount: 0 },
    { id: 2, amount: 100, paid_amount: 0 },
  ];
  const { allocation, creditsToUpdate } = fifoAllocatePayment(150, credits);

  assert.equal(allocation.length, 2);
  assert.equal(allocation[0].credit_id, 1);
  assert.equal(allocation[0].amount, 150);
  assert.equal(allocation[1].credit_id, 2);
  assert.equal(allocation[1].amount, 0);
  assert.equal(creditsToUpdate.length, 2);
  assert.equal(creditsToUpdate[0].id, 1);
  assert.equal(creditsToUpdate[0].paid_amount, 150);
  assert.equal(creditsToUpdate[0].status, 'partial');
  assert.equal(creditsToUpdate[1].id, 2);
  assert.equal(creditsToUpdate[1].paid_amount, 0);
  assert.equal(creditsToUpdate[1].status, 'partial');
});

runTest('fifo allocates payment across multiple credits', () => {
  const credits = [
    { id: 1, amount: 200, paid_amount: 0 },
    { id: 2, amount: 100, paid_amount: 0 },
  ];
  const { allocation, creditsToUpdate } = fifoAllocatePayment(250, credits);

  assert.deepEqual(allocation, [
    { credit_id: 1, amount: 200 },
    { credit_id: 2, amount: 50 },
  ]);
  assert.equal(creditsToUpdate.length, 2);
  assert.equal(creditsToUpdate[0].status, 'paid');
  assert.equal(creditsToUpdate[1].status, 'partial');
});

runTest('fifo handles overpayment (excess becomes prepay)', () => {
  const credits = [
    { id: 1, amount: 100, paid_amount: 0 },
  ];
  const { allocation, creditsToUpdate } = fifoAllocatePayment(150, credits);

  assert.equal(allocation.length, 1);
  assert.equal(allocation[0].credit_id, 1);
  assert.equal(allocation[0].amount, 100);
  assert.equal(creditsToUpdate.length, 1);
  assert.equal(creditsToUpdate[0].status, 'paid');
});

runTest('fifo handles partial payment against existing paid_amount', () => {
  const credits = [
    { id: 1, amount: 500, paid_amount: 200 },
    { id: 2, amount: 300, paid_amount: 0 },
  ];
  const { allocation, creditsToUpdate } = fifoAllocatePayment(200, credits);

  assert.equal(allocation.length, 2);
  assert.equal(allocation[0].credit_id, 1);
  assert.equal(allocation[0].amount, 200);
  assert.equal(creditsToUpdate[0].paid_amount, 400);
  assert.equal(creditsToUpdate[0].status, 'partial');
  assert.equal(creditsToUpdate.length, 2);
});

runTest('fifo ignores fully paid credits', () => {
  const credits = [
    { id: 1, amount: 100, paid_amount: 100 },
    { id: 2, amount: 100, paid_amount: 0 },
  ];
  const { allocation, creditsToUpdate } = fifoAllocatePayment(50, credits);

  assert.equal(allocation.length, 1);
  assert.equal(allocation[0].credit_id, 2);
  assert.equal(allocation[0].amount, 50);
  assert.equal(creditsToUpdate.length, 1);
  assert.equal(creditsToUpdate[0].id, 2);
});

console.log('Ledger verification passed.');

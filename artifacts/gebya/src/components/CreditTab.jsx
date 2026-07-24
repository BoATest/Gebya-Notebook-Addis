import { Suspense, useState } from 'react';
import { useLang } from '../context/LangContext';
import { useAppStore } from '../stores/appStore';
import { PanelFallback } from './Fallbacks';
import OverdueCustomerFlags from './OverdueCustomerFlags';
import { CustomerList, CustomerDetail, SupplierList, SupplierDetail } from '../utils/lazyImports';
import { CUSTOMER_TRANSACTION_TYPES } from '../utils/customerTransactionTypes';
import { SUPPLIER_TRANSACTION_TYPES } from '../utils/supplierLedger';
import { buildCreditReport, exportCreditReportCsv, exportCreditReportPdf } from '../utils/customerMetrics';

export default function CreditTab({
  selectedCustomer,
  selectedSupplier,
  shopProfile,
  enrichedCustomerSummaries,
  creditMetrics,
  supplierSummaries,
  customerTransactions,
  onToggleTelegramNotify,
  onResendTelegramUpdate,
  onSelectTransaction,
  onSelectSupplierTransaction,
  onSetReminderDefaultChannel,
  onTransfer,
}) {
  const { t, lang } = useLang();
  const creditView = useAppStore(s => s.creditView);
  const setCreditView = useAppStore(s => s.setCreditView);
  const setSelectedCustomerId = useAppStore(s => s.setSelectedCustomerId);
  const setSelectedSupplierId = useAppStore(s => s.setSelectedSupplierId);
  const setCustomerTransactionModal = useAppStore(s => s.setCustomerTransactionModal);
  const setShowCustomerForm = useAppStore(s => s.setShowCustomerForm);
  const setShowSupplierForm = useAppStore(s => s.setShowSupplierForm);
  const setCustomerEditTarget = useAppStore(s => s.setCustomerEditTarget);
  const setTelegramConnectCustomerId = useAppStore(s => s.setTelegramConnectCustomerId);
  const setReminderTarget = useAppStore(s => s.setReminderTarget);
  const setSupplierTransactionModal = useAppStore(s => s.setSupplierTransactionModal);
  const setSupplierEditTarget = useAppStore(s => s.setSupplierEditTarget);
  const setBulkReminderQueue = useAppStore(s => s.setBulkReminderQueue);

  return (
    <>
      {!selectedCustomer && !selectedSupplier && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}>
          <div style={{
            display: 'inline-flex',
            background: '#f3f4f6',
            borderRadius: 999,
            padding: 3,
            gap: 2,
          }}>
            <button
              type="button"
              onClick={() => setCreditView('customers')}
              className="press-scale"
              style={{
                padding: '8px 20px',
                borderRadius: 999,
                fontSize: '0.82rem', fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: creditView === 'customers' ? '#1a1a1a' : 'transparent',
                color: creditView === 'customers' ? '#fff' : '#6b7280',
              }}
            >
              {t.customersLabel}
            </button>
            <button
              type="button"
              onClick={() => setCreditView('suppliers')}
              className="press-scale"
              style={{
                padding: '8px 20px',
                borderRadius: 999,
                fontSize: '0.82rem', fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: creditView === 'suppliers' ? '#1a1a1a' : 'transparent',
                color: creditView === 'suppliers' ? '#fff' : '#6b7280',
              }}
            >
              {t.suppliersLabel}
            </button>
          </div>
          {creditView === 'customers' && enrichedCustomerSummaries?.length > 0 && (
            <>
            <button
              type="button"
              onClick={() => {
                try {
                  const report = buildCreditReport({
                    shopName: shopProfile?.name || 'Shop',
                    shopPhone: shopProfile?.phone || '',
                    enrichedSummaries: enrichedCustomerSummaries,
                    customerTransactions: customerTransactions || [],
                  });
                  exportCreditReportCsv(report);
                } catch (err) {
                  if (import.meta.env.DEV) console.error('CSV Export failed:', err);
                }
              }}
              className="press-scale"
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: '0.7rem', fontWeight: 600,
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                background: '#fff',
                color: '#6b7280',
                marginLeft: 8,
              }}
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const report = buildCreditReport({
                    shopName: shopProfile?.name || 'Shop',
                    shopPhone: shopProfile?.phone || '',
                    enrichedSummaries: enrichedCustomerSummaries,
                    customerTransactions: customerTransactions || [],
                  });
                  exportCreditReportPdf(report, lang);
                } catch (err) {
                  if (import.meta.env.DEV) console.error('PDF Export failed:', err);
                }
              }}
              className="press-scale"
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: '0.7rem', fontWeight: 600,
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                background: '#fff',
                color: '#6b7280',
                marginLeft: 4,
              }}
            >
              PDF
            </button>
            </>
          )}
        </div>
      )}

      {creditView === 'customers' && (
        selectedCustomer ? (
          <Suspense fallback={<PanelFallback label={t.loading} />}>
            <CustomerDetail
              customer={selectedCustomer}
              shopName={shopProfile?.name}
              onBack={() => setSelectedCustomerId(null)}
              onAddCredit={() => setCustomerTransactionModal({
                mode: CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD,
                customerId: selectedCustomer.id,
              })}
              onRecordPayment={() => setCustomerTransactionModal({
                mode: CUSTOMER_TRANSACTION_TYPES.PAYMENT,
                customerId: selectedCustomer.id,
              })}
              onMarkFullyPaid={(c) => setCustomerTransactionModal({
                mode: CUSTOMER_TRANSACTION_TYPES.PAYMENT,
                customerId: c.id,
                initialAmount: Number(c.balance || 0),
              })}
              onToggleTelegramNotify={() => onToggleTelegramNotify(selectedCustomer)}
              onOpenTelegramConnect={() => setTelegramConnectCustomerId(selectedCustomer.id)}
              onResendTelegramUpdate={() => onResendTelegramUpdate(selectedCustomer)}
              onRemind={(c) => setReminderTarget(c)}
              onSmsCustomer={(c) => { onSetReminderDefaultChannel('sms'); setReminderTarget(c); }}
              onEditCustomer={(c) => setCustomerEditTarget(c)}
              onSelectTransaction={(tx) => onSelectTransaction(tx)}
              onTransfer={onTransfer}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<PanelFallback label={t.loading} />}>
            <OverdueCustomerFlags />
            <CustomerList
              customers={enrichedCustomerSummaries}
              metrics={creditMetrics}
              onSelectCustomer={(customer) => setSelectedCustomerId(customer.id)}
              onAddCustomer={() => setShowCustomerForm(true)}
              onRemindCustomer={(customer) => setReminderTarget(customer)}
              onQuickCredit={(customer) => setCustomerTransactionModal({
                mode: CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD,
                customerId: customer.id,
              })}
              onBulkRemind={() => {
                const queue = enrichedCustomerSummaries
                  .filter((c) => c.has_overdue
                    && (c.telegram_chat_id || c.telegram_username || c.phone_number))
                  .map((c) => c.id);
                if (queue.length === 0) return;
                setBulkReminderQueue(queue.slice(1));
                setReminderTarget(enrichedCustomerSummaries.find(c => c.id === queue[0]));
              }}
            />
          </Suspense>
        )
      )}

      {creditView === 'suppliers' && (
        selectedSupplier ? (
          <Suspense fallback={<PanelFallback label={t.loading} />}>
            <SupplierDetail
              supplier={selectedSupplier}
              onBack={() => setSelectedSupplierId(null)}
              onAddPurchase={() => setSupplierTransactionModal({
                mode: SUPPLIER_TRANSACTION_TYPES.PURCHASE_ADD,
                supplierId: selectedSupplier.id,
              })}
              onPaySupplier={() => setSupplierTransactionModal({
                mode: SUPPLIER_TRANSACTION_TYPES.PAYMENT,
                supplierId: selectedSupplier.id,
              })}
              onMarkFullyPaid={(s) => setSupplierTransactionModal({
                mode: SUPPLIER_TRANSACTION_TYPES.PAYMENT,
                supplierId: s.id,
                initialAmount: Number(s.balance || 0),
              })}
              onEditSupplier={(s) => setSupplierEditTarget(s)}
              onSelectTransaction={(tx) => onSelectSupplierTransaction(tx)}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<PanelFallback label={t.loading} />}>
            <SupplierList
              suppliers={supplierSummaries}
              onSelectSupplier={(s) => setSelectedSupplierId(s.id)}
              onAddSupplier={() => setShowSupplierForm(true)}
            />
          </Suspense>
        )
      )}
    </>
  );
}

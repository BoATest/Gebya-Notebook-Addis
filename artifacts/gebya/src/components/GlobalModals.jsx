import { Suspense } from 'react';
import { useLang } from '../context/LangContext';
import { useAppStore } from '../stores/appStore';
import { useShopStore } from '../stores/shopStore';
import { ModalFallback } from './Fallbacks';
import ShareModal from './ShareModal';
import {
  TransactionForm, EditTransactionSheet, ReminderSheet,
  CustomerForm, CustomerTransactionSheet, CustomerTelegramConnectSheet,
  SupplierForm, SupplierTransactionSheet,
  ItemizedSaleView, NotificationPanel,
} from '../utils/lazyImports';
import { CUSTOMER_TRANSACTION_TYPES } from '../utils/customerTransactionTypes';

export default function GlobalModals({
  enrichedCustomerSummaries,
  customerSummaries,
  supplierSummaries,
  activeCatalogEntries,
  recurringExpenses,
  setRecurringExpenses,
  currentActorLabel,
  enabledProviders,
  lastPayment,
  todaySales,
  reminderDefaultChannel,
  setReminderDefaultChannel,
  setSelectedSupplierId,
  showItemizedSale,
  setShowItemizedSale,
  showNotificationPanel,
  setShowNotificationPanel,
  handleAddTransaction,
  handleSaveCustomerTransaction,
  handleAddCustomer,
  handleSaveSupplier,
  handleSaveSupplierTransaction,
  handleConfirmCustomerTelegramConnection,
  handleResendCustomerTelegramUpdate,
  handleUpdateTransaction,
  handleCustomerReminderSent,
  handleSaveCatalogEntry,
  handleAddCustomerInline,
}) {
  const { t } = useLang();
  const shopProfile = useShopStore(s => s.shopProfile);

  const showForm = useAppStore(s => s.showForm);
  const setShowForm = useAppStore(s => s.setShowForm);
  const showCustomerForm = useAppStore(s => s.showCustomerForm);
  const setShowCustomerForm = useAppStore(s => s.setShowCustomerForm);
  const customerEditTarget = useAppStore(s => s.customerEditTarget);
  const setCustomerEditTarget = useAppStore(s => s.setCustomerEditTarget);
  const customerTransactionModal = useAppStore(s => s.customerTransactionModal);
  const setCustomerTransactionModal = useAppStore(s => s.setCustomerTransactionModal);
  const customerTransactionEditTarget = useAppStore(s => s.customerTransactionEditTarget);
  const setCustomerTransactionEditTarget = useAppStore(s => s.setCustomerTransactionEditTarget);
  const telegramConnectCustomerId = useAppStore(s => s.telegramConnectCustomerId);
  const setTelegramConnectCustomerId = useAppStore(s => s.setTelegramConnectCustomerId);
  const showSupplierForm = useAppStore(s => s.showSupplierForm);
  const setShowSupplierForm = useAppStore(s => s.setShowSupplierForm);
  const supplierEditTarget = useAppStore(s => s.supplierEditTarget);
  const setSupplierEditTarget = useAppStore(s => s.setSupplierEditTarget);
  const supplierTransactionModal = useAppStore(s => s.supplierTransactionModal);
  const setSupplierTransactionModal = useAppStore(s => s.setSupplierTransactionModal);
  const supplierTransactionEditTarget = useAppStore(s => s.supplierTransactionEditTarget);
  const setSupplierTransactionEditTarget = useAppStore(s => s.setSupplierTransactionEditTarget);
  const editTarget = useAppStore(s => s.editTarget);
  const setEditTarget = useAppStore(s => s.setEditTarget);
  const reminderTarget = useAppStore(s => s.reminderTarget);
  const setReminderTarget = useAppStore(s => s.setReminderTarget);
  const showShareModal = useAppStore(s => s.showShareModal);
  const setShowShareModal = useAppStore(s => s.setShowShareModal);
  const shareText = useAppStore(s => s.shareText);
  const setActiveTab = useAppStore(s => s.setActiveTab);

  const telegramConnectCustomer = telegramConnectCustomerId
    ? customerSummaries.find(c => c.id === telegramConnectCustomerId) || null
    : null;

  const activeCustomerTransactionModal = customerTransactionModal?.customerId
    ? enrichedCustomerSummaries.find(c => c.id === customerTransactionModal.customerId) || null
    : null;

  const activeSupplierTransactionModal = supplierTransactionModal?.supplierId
    ? supplierSummaries.find(s => s.id === supplierTransactionModal.supplierId) || null
    : null;

  return (
    <>
      {showForm && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <TransactionForm
            type={showForm}
            onSave={handleAddTransaction}
            onDone={() => setShowForm(null)}
            actorLabel={currentActorLabel}
            enabledProviders={enabledProviders}
            catalogEntries={activeCatalogEntries}
            recurringExpenses={recurringExpenses}
            onRecurringChange={setRecurringExpenses}
            onSaveCatalogEntry={handleSaveCatalogEntry}
            customers={customerSummaries}
            onAddCustomerInline={handleAddCustomerInline}
            initialPaymentType={(showForm === 'sale' || showForm === 'expense') ? lastPayment[showForm]?.type : undefined}
            initialPaymentProvider={(showForm === 'sale' || showForm === 'expense') ? lastPayment[showForm]?.provider : undefined}
            lastPaymentHistory={(showForm === 'sale' || showForm === 'expense') ? {
              bank:   lastPayment[showForm]?.bankProvider   || '',
              wallet: lastPayment[showForm]?.walletProvider || '',
            } : undefined}
          />
        </Suspense>
      )}

      {showItemizedSale && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <ItemizedSaleView
            onSave={handleAddTransaction}
            onDone={() => setShowItemizedSale(false)}
            actorLabel={currentActorLabel}
            shopProfile={shopProfile}
            enabledProviders={enabledProviders}
            catalogEntries={activeCatalogEntries}
            onSaveCatalogEntry={handleSaveCatalogEntry}
            onAddCustomerInline={handleAddCustomerInline}
            customers={customerSummaries}
            transactions={todaySales}
            onHistory={() => { setShowItemizedSale(false); setActiveTab('report'); }}
            onViewTransaction={(tx) => setEditTarget(tx)}
          />
        </Suspense>
      )}

      {showCustomerForm && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <CustomerForm
            onSave={handleAddCustomer}
            onDone={() => setShowCustomerForm(false)}
          />
        </Suspense>
      )}

      {customerEditTarget && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <CustomerForm
            existing={customerEditTarget}
            onSave={async (payload) => {
              const ok = await handleAddCustomer({ ...payload, id: customerEditTarget.id });
              if (ok) setCustomerEditTarget(null);
              return ok;
            }}
            onDone={() => setCustomerEditTarget(null)}
          />
        </Suspense>
      )}

      {customerTransactionModal && activeCustomerTransactionModal && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <CustomerTransactionSheet
            customer={activeCustomerTransactionModal}
            mode={customerTransactionModal.mode}
            initialAmount={customerTransactionModal.initialAmount}
            onSave={handleSaveCustomerTransaction}
            actorLabel={currentActorLabel}
            catalogEntries={activeCatalogEntries}
            enabledProviders={enabledProviders}
            onDone={() => setCustomerTransactionModal(null)}
          />
        </Suspense>
      )}

      {customerTransactionEditTarget?.transaction && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <CustomerTransactionSheet
            customer={enrichedCustomerSummaries.find(c => c.id === customerTransactionEditTarget.customerId) || null}
            mode={customerTransactionEditTarget.transaction.type}
            editingTransaction={customerTransactionEditTarget.transaction}
            onSave={handleSaveCustomerTransaction}
            actorLabel={currentActorLabel}
            catalogEntries={activeCatalogEntries}
            enabledProviders={enabledProviders}
            onDone={() => setCustomerTransactionEditTarget(null)}
          />
        </Suspense>
      )}

      {showSupplierForm && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <SupplierForm
            onSave={handleSaveSupplier}
            onDone={(saved) => {
              setShowSupplierForm(false);
              if (saved && saved.id) setSelectedSupplierId(saved.id);
            }}
          />
        </Suspense>
      )}

      {supplierEditTarget && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <SupplierForm
            existing={supplierEditTarget}
            onSave={async (payload) => {
              const saved = await handleSaveSupplier({ ...payload, id: supplierEditTarget.id });
              if (saved) setSupplierEditTarget(null);
              return saved;
            }}
            onDone={() => setSupplierEditTarget(null)}
          />
        </Suspense>
      )}

      {supplierTransactionModal && activeSupplierTransactionModal && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <SupplierTransactionSheet
            supplier={activeSupplierTransactionModal}
            mode={supplierTransactionModal.mode}
            initialAmount={supplierTransactionModal.initialAmount}
            onSave={handleSaveSupplierTransaction}
            actorLabel={currentActorLabel}
            enabledProviders={enabledProviders}
            onDone={() => setSupplierTransactionModal(null)}
          />
        </Suspense>
      )}

      {supplierTransactionEditTarget?.transaction && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <SupplierTransactionSheet
            supplier={supplierSummaries.find(s => s.id === supplierTransactionEditTarget.supplierId) || null}
            mode={supplierTransactionEditTarget.transaction.type}
            editingTransaction={supplierTransactionEditTarget.transaction}
            onSave={handleSaveSupplierTransaction}
            actorLabel={currentActorLabel}
            enabledProviders={enabledProviders}
            onDone={() => setSupplierTransactionEditTarget(null)}
          />
        </Suspense>
      )}

      {telegramConnectCustomer && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <CustomerTelegramConnectSheet
            customer={telegramConnectCustomer}
            shopProfile={shopProfile}
            onSave={(payload) => handleConfirmCustomerTelegramConnection(telegramConnectCustomer, payload)}
            onResendUpdate={() => handleResendCustomerTelegramUpdate(telegramConnectCustomer)}
            onDone={() => setTelegramConnectCustomerId(null)}
          />
        </Suspense>
      )}

      {editTarget && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <EditTransactionSheet
            transaction={editTarget}
            enabledProviders={enabledProviders}
            onUpdate={handleUpdateTransaction}
            onClose={() => setEditTarget(null)}
          />
        </Suspense>
      )}

      {reminderTarget && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <ReminderSheet
            customer={reminderTarget}
            shopName={shopProfile?.name}
            shopProfile={shopProfile}
            defaultChannel={reminderDefaultChannel}
            onClose={() => { setReminderTarget(null); setReminderDefaultChannel(null); }}
            onSent={handleCustomerReminderSent}
          />
        </Suspense>
      )}

      {showNotificationPanel && (
        <Suspense fallback={<ModalFallback label={t.loading} />}>
          <NotificationPanel
            onClose={() => setShowNotificationPanel(false)}
          />
        </Suspense>
      )}

      {showShareModal && (
        <ShareModal
          summary={shareText}
          telegram={shopProfile?.telegram}
          onClose={() => setShowShareModal(false)}
          t={t}
        />
      )}
    </>
  );
}

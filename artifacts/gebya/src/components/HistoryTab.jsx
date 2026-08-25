import { Suspense } from 'react';
import { useLang } from '../context/LangContext';
import { PanelFallback } from './Fallbacks';
import { ReportView } from '../utils/lazyImports';

export default function HistoryTab({
  transactions,
  ledgerTransactions,
  enrichedCustomerSummaries,
  customers,
  shopProfile,
  onEdit,
  onShareReport,
  catalogEntries,
  staffMembers,
  canSwitchPeople,
  myStaffId,
}) {
  const { t } = useLang();
  return (
    <Suspense fallback={<PanelFallback label={t.loading} />}>
      <ReportView
        transactions={transactions}
        ledgerTransactions={ledgerTransactions}
        enrichedCustomerSummaries={enrichedCustomerSummaries}
        customers={customers}
        shopProfile={shopProfile}
        onEdit={onEdit}
        onShareReport={onShareReport}
        catalogEntries={catalogEntries}
        staffMembers={staffMembers}
        canSwitchPeople={canSwitchPeople}
        myStaffId={myStaffId}
      />
    </Suspense>
  );
}

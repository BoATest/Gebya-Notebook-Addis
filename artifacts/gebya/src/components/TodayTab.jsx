import { useMemo } from 'react';
import { Share2 } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAppStore } from '../stores/appStore';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import ShopPulse from './ShopPulse';
import TodaySales from './TodaySales';
import KnowledgeSection from './KnowledgeSection';
import DiaryCard from './DiaryCard';
import TxRow from './TxRow';
import { DailySuggestions } from '../utils/lazyImports';
import { fmt } from '../utils/numformat';
import { computeShopDiary } from '../utils/shopStory';

function computeObservations(sales, expenses, customersWithDebt, period, bestSeller, closingDone) {
  const obs = [];
  const saleCount = sales.length;
  const expCount = expenses.length;

  if (saleCount > 0) {
    obs.push(`${saleCount} sale${saleCount !== 1 ? 's' : ''} recorded today`);
  } else if (period === 'morning') {
    obs.push('Start your day — record your first sale');
  } else {
    obs.push('No sales recorded today');
  }

  if (expCount > 0) {
    obs.push(`${expCount} expense${expCount !== 1 ? 's' : ''} recorded`);
  }

  const overdue = customersWithDebt.filter(c => c.has_overdue);
  if (overdue.length > 0) {
    const totalOwed = overdue.reduce((s, c) => s + Number(c.balance || 0), 0);
    obs.push(`${overdue.length} customer${overdue.length !== 1 ? 's' : ''} still owe ${fmt(totalOwed)} ETB`);
  }

  if (bestSeller && saleCount > 2) {
    obs.push(`${bestSeller.name} sold best today`);
  }

  if (closingDone) {
    obs.push('Day closed successfully');
  } else if (period === 'evening' || period === 'night') {
    obs.push('Cash still needs counting before closing');
  }

  return obs;
}

function computeFocusItems(sales, customersWithDebt, period, closingDone) {
  const items = [];
  const hasNoSales = sales.length === 0;

  if (hasNoSales) {
    items.push({ label: 'Record your first sale', action: 'sale', icon: '🛒' });
  }

  const overdue = customersWithDebt.filter(c => c.has_overdue);
  if (overdue.length > 0) {
    items.push({
      label: `Follow up with ${overdue[0].display_name || 'overdue customers'}`,
      action: 'follow_up',
      icon: '📞',
    });
  }

  if (!closingDone && (period === 'evening' || period === 'night')) {
    items.push({ label: 'Count today\'s cash', action: 'count_cash', icon: '💰' });
  }

  if (!closingDone && period === 'night') {
    items.push({ label: 'Close the shop', action: 'close_shop', icon: '🏁' });
  }

  return items;
}

export default function TodayTab({
  transactions,
  todayTransactions,
  ledgerTransactions,
  lastSavedSnapshot,
  lastBackupAt,
  onShareReport,
  customerSummaries = [],
  shopProfile,
  ledgerCustomers = [],
  catalogEntries = [],
}) {
  const { lang, t } = useLang();
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const setShowForm = useAppStore(s => s.setShowForm);
  const setEditTarget = useAppStore(s => s.setEditTarget);
  const setDeleteTarget = useAppStore(s => s.setDeleteTarget);
  const backupNudgeDismissed = useAppStore(s => s.backupNudgeDismissed);
  const setBackupNudgeDismissed = useAppStore(s => s.setBackupNudgeDismissed);
  const { period, greeting } = useTimeOfDay();

  const sales = useMemo(() => todayTransactions.filter(tx => tx.type === 'sale'), [todayTransactions]);
  const expenses = useMemo(() => todayTransactions.filter(tx => tx.type === 'expense'), [todayTransactions]);
  const todayCredits = useMemo(() => todayTransactions.filter(tx => tx.type === 'credit'), [todayTransactions]);

  const salesTotal = useMemo(() => sales.reduce((s, tx) => s + (tx.amount || 0), 0), [sales]);
  const expensesTotal = useMemo(() => expenses.reduce((s, tx) => s + (tx.amount || 0), 0), [expenses]);

  const cashSales = useMemo(() => sales.filter(tx =>
    !tx.payment_type || tx.payment_type === 'cash'
  ), [sales]);
  const digitalSales = useMemo(() => sales.filter(tx =>
    tx.payment_type === 'wallet' || tx.payment_type === 'bank' || tx.payment_type === 'transfer'
  ), [sales]);
  const cashTotal = useMemo(() => cashSales.reduce((s, tx) => s + (tx.amount || 0), 0), [cashSales]);
  const digitalTotal = useMemo(() => digitalSales.reduce((s, tx) => s + (tx.amount || 0), 0), [digitalSales]);

  const customersWithDebt = useMemo(() =>
    (customerSummaries || []).filter(c => Number(c.balance || 0) > 0),
    [customerSummaries]
  );

  const totalOwed = useMemo(() =>
    customersWithDebt.reduce((s, c) => s + Number(c.balance || 0), 0),
    [customersWithDebt]
  );

  const overdueCustomers = useMemo(() =>
    customersWithDebt.filter(c => c.has_overdue),
    [customersWithDebt]
  );

  const bestSeller = useMemo(() => {
    const counts = {};
    sales.forEach(tx => {
      const name = tx.item_name || tx.item_note;
      if (!name) return;
      counts[name] = (counts[name] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? { name: entries[0][0], count: entries[0][1] } : null;
  }, [sales]);

  const productSales = useMemo(() => {
    const byItem = {};
    for (const tx of sales) {
      const name = tx.item_name || tx.item_note;
      if (!name) continue;
      if (!byItem[name]) byItem[name] = { name, revenue: 0, count: 0, quantity: 0 };
      byItem[name].revenue += tx.amount || 0;
      byItem[name].count += 1;
      byItem[name].quantity += tx.quantity || 1;
    }
    return Object.values(byItem).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [sales]);

  const closingDone = false;

  const observations = useMemo(() =>
    computeObservations(sales, expenses, customersWithDebt, period, bestSeller, closingDone),
    [sales, expenses, customersWithDebt, period, bestSeller, closingDone]
  );

  const focusItems = useMemo(() =>
    computeFocusItems(sales, customersWithDebt, period, closingDone),
    [sales, customersWithDebt, period, closingDone]
  );

  const diary = useMemo(() => {
    const topItem = productSales.length > 0 ? productSales[0] : null;
    return computeShopDiary({
      metrics: {
        saleRows: sales,
        totalSold: salesTotal,
        spentToday: expensesTotal,
      },
      topItem,
      overdueCount: overdueCustomers.length,
      closingDone,
      cashMismatch: false,
      lang,
    });
  }, [sales, salesTotal, expensesTotal, productSales, overdueCustomers, closingDone, lang]);

  const allTransactions = useMemo(() => {
    const combined = [
      ...todayTransactions.map(tx => ({ ...tx, _type: 'tx' })),
    ];
    const todayLedger = ledgerTransactions.filter(entry =>
      new Date(entry.created_at).toDateString() === new Date().toDateString()
    );
    combined.push(...todayLedger.map(entry => ({ ...entry, _type: 'ledger' })));
    return combined.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [todayTransactions, ledgerTransactions]);

  const paymentBreakdown = useMemo(() => {
    const cashCount = sales.filter(tx => !tx.payment_type || tx.payment_type === 'cash').length;
    const digitalCount = sales.filter(tx =>
      tx.payment_type === 'wallet' || tx.payment_type === 'bank' || tx.payment_type === 'transfer'
    ).length;
    const creditCount = todayCredits.length;
    return { cash: cashCount, digital: digitalCount, credit: creditCount };
  }, [sales, todayCredits]);

  return (
    <div className="space-y-3 pb-36">

      {/* Shop Pulse */}
      <ShopPulse
        greeting={greeting}
        shopName={shopProfile?.name}
        period={period}
        observations={observations}
        focusItems={focusItems}
        lang={lang}
      />

      {/* Today's Sales summary */}
      <TodaySales
        salesTotal={salesTotal}
        cashTotal={cashTotal}
        digitalTotal={digitalTotal}
        entryCount={todayTransactions.length}
      />

      {/* Data-loss backup nudge */}
      {(() => {
        if (backupNudgeDismissed || lastBackupAt === undefined) return null;
        const hasData = (transactions.length + ledgerTransactions.length) >= 5;
        if (!hasData) return null;
        const stale = lastBackupAt === null || (Date.now() - lastBackupAt) > 7 * 86400000;
        if (!stale) return null;
        const neverBackedUp = lastBackupAt === null;
        return (
          <div style={{
            background: neverBackedUp ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${neverBackedUp ? '#fecaca' : '#fde68a'}`,
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{neverBackedUp ? '⚠️' : '⏰'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: neverBackedUp ? '#991b1b' : '#92400e' }}>
                {neverBackedUp
                  ? (lang === 'am' ? 'ደብተርዎን ያስቀምጡ' : 'Back up your notebook')
                  : (lang === 'am' ? 'ደብተርዎን ለማስቀመጥ ጊዜው አልፏል' : 'Backup is overdue')}
              </p>
              <p style={{ fontSize: 10, color: '#6b7280', marginTop: 1, lineHeight: 1.35 }}>
                {lang === 'am'
                  ? 'የእርስዎ መረጃ የሚገኘው በዚህ ስልክ ላይ ብቻ ነው።'
                  : 'Your data lives on this phone. Back it up.'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                style={{
                  background: neverBackedUp ? '#dc2626' : '#C4883A',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '6px 10px', fontSize: 10, fontWeight: 800,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {lang === 'am' ? 'ያስቀምጡ' : 'Back up'}
              </button>
              <button
                type="button"
                onClick={() => setBackupNudgeDismissed(true)}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#9ca3af', fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', padding: 2,
                }}
              >
                {lang === 'am' ? 'በኋላ' : 'Later'}
              </button>
            </div>
          </div>
        );
      })()}

      <DailySuggestions
        todayTransactions={todayTransactions}
        period={period}
        bestSeller={bestSeller}
        overdueCount={overdueCustomers.length}
        onAction={(type) => setShowForm(type)}
      />

      {/* Notebook entries — the hero */}
      <div>
        <div className="flex items-center justify-between pb-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 font-sans">
            {lang === 'am' ? 'የዛሬ ምዝገባ' : "TODAY'S NOTEBOOK"}
            <span className="ml-2 text-[11px] font-semibold text-gray-400 tracking-normal normal-case">
              {todayTransactions.length}
            </span>
          </h3>
          <button
            onClick={onShareReport}
            className="p-1.5 press-scale"
            aria-label={lang === 'am' ? 'አጋራ' : 'Share'}
          >
            <Share2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {todayTransactions.length === 0 && ledgerTransactions.filter(
          entry => new Date(entry.created_at).toDateString() === new Date().toDateString()
        ).length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>
              {lang === 'am' ? 'ገና ምንም ምዝገባ የለም' : 'No entries yet'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
              {lang === 'am' ? 'ለመጀመር ከላይ ያሉትን አዝራሮች ይጫኑ' : 'Tap Sell, Spend, or Credit above'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            {todayTransactions.map(tx => (
              <TxRow
                key={tx.id}
                tx={tx}
                onTap={() => setEditTarget(tx)}
                onEdit={() => setEditTarget(tx)}
                onDelete={() => setDeleteTarget(tx)}
                t={t}
                lang={lang}
                fmt={fmt}
              />
            ))}
          </div>
        )}
      </div>

      {/* Knowledge Section: How much did I sell today? */}
      {(sales.length > 0 || expenses.length > 0) && (
        <KnowledgeSection
          title={lang === 'am' ? 'ዛሬ ምን ያህል ሸጥኩ?' : 'How much did I sell today?'}
          subtitle={lang === 'am' ? `${fmt(salesTotal)} ብር ሽያጭ` : `${fmt(salesTotal)} ETB in sales`}
        >
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                {lang === 'am' ? 'ሽያጭ' : 'Sales'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#16a34a' }}>
                {fmt(salesTotal)} ETB
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                {lang === 'am' ? 'ወጪ' : 'Expenses'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#dc2626' }}>
                {fmt(expensesTotal)} ETB
              </span>
            </div>
            {cashTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                  💵 {lang === 'am' ? 'ጥሬ ገንዘብ' : 'Cash'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#374151' }}>
                  {fmt(cashTotal)} ETB
                </span>
              </div>
            )}
            {digitalTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                  📱 {lang === 'am' ? 'ዲጂታል' : 'Digital'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#d97706' }}>
                  {fmt(digitalTotal)} ETB
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, fontWeight: 700 }}>
              <span>💵 {paymentBreakdown.cash} {lang === 'am' ? 'ጥሬ' : 'cash'}</span>
              {paymentBreakdown.digital > 0 && (
                <span>📱 {paymentBreakdown.digital} {lang === 'am' ? 'ዲጂታል' : 'digital'}</span>
              )}
              {paymentBreakdown.credit > 0 && (
                <span>📝 {paymentBreakdown.credit} {lang === 'am' ? 'ዱቤ' : 'credit'}</span>
              )}
            </div>
          </div>
        </KnowledgeSection>
      )}

      {/* Knowledge Section: Who still owes me? */}
      {customersWithDebt.length > 0 && (
        <KnowledgeSection
          title={lang === 'am' ? 'ማን ይሄዳል?' : 'Who still owes me?'}
          subtitle={lang === 'am'
            ? `${customersWithDebt.length} ደንበኛ · ${fmt(totalOwed)} ብር`
            : `${customersWithDebt.length} customers · ${fmt(totalOwed)} ETB`}
          badge={overdueCustomers.length > 0 ? { text: overdueCustomers.length, color: '#dc2626' } : null}
        >
          <div style={{ marginTop: 8 }}>
            {customersWithDebt.slice(0, 5).map((c, i) => {
              const isOverdue = c.has_overdue;
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 0',
                    borderBottom: i < Math.min(customersWithDebt.length, 5) - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('gebya:navigate', {
                      detail: { tab: 'credit', customerId: c.id },
                    }));
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isOverdue ? '#fef2f2' : '#f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900,
                    color: isOverdue ? '#dc2626' : '#6b7280',
                    flexShrink: 0,
                  }}>
                    {(c.display_name || c.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.display_name || c.name || (lang === 'am' ? 'ደንበኛ' : 'Customer')}
                    </p>
                    {isOverdue && (
                      <p style={{ fontSize: 10, color: '#dc2626' }}>
                        {c.overdue_days ? `${c.overdue_days} ${lang === 'am' ? 'ቀን አልፏል' : 'days overdue'}` : (lang === 'am' ? 'ዘግይቷል' : 'Overdue')}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color: isOverdue ? '#dc2626' : '#d97706' }}>
                    {fmt(c.balance)}
                  </span>
                </div>
              );
            })}
          </div>
        </KnowledgeSection>
      )}

      {/* Knowledge Section: What sold today? */}
      {productSales.length > 0 && (
        <KnowledgeSection
          title={lang === 'am' ? 'ምን ተሸጠ?' : 'What sold today?'}
          subtitle={bestSeller
            ? (lang === 'am' ? `${bestSeller.name} በብዛት ተሽጧል` : `${bestSeller.name} sold best today`)
            : ''}
        >
          <div style={{ marginTop: 8 }}>
            {productSales.map((item, i) => (
              <div key={item.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: i < productSales.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: 6,
                  background: i === 0 ? '#1B4332' : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900,
                  color: i === 0 ? '#fff' : '#6b7280',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: 10, color: '#9ca3af' }}>
                    {item.count}x · {item.quantity > 0 ? `${item.quantity} ${lang === 'am' ? 'ቁጥር' : 'units'}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#16a34a' }}>
                  {fmt(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        </KnowledgeSection>
      )}

      {/* Knowledge Section: Can I close the shop? (evening/night only) */}
      {(period === 'evening' || period === 'night') && (
        <KnowledgeSection
          title={lang === 'am' ? 'ሱቁን መዝጋት እችላለሁ?' : 'Can I close the shop?'}
          subtitle={lang === 'am' ? 'የዛሬን ገንዘብ ያረጋግጡ' : 'Verify today\'s money'}
          defaultExpanded={true}
          sectionId="closing"
        >
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                  {lang === 'am' ? 'ጥሬ ገንዘብ' : 'Cash'}
                </p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#374151', marginTop: 4 }}>
                  {fmt(salesTotal - digitalTotal)}
                </p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                  {lang === 'am' ? 'ገቢ' : 'Digital'}
                </p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#d97706', marginTop: 4 }}>
                  {fmt(digitalTotal)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('gebya:navigate', { detail: { tab: 'history' } }))}
              style={{
                width: '100%',
                minHeight: 44,
                border: 'none',
                borderRadius: 10,
                background: '#1B4332',
                color: '#fff',
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {lang === 'am' ? 'ሱቁን ዝጋ' : 'Close Shop'} →
            </button>
          </div>
        </KnowledgeSection>
      )}

      {/* Diary */}
      <DiaryCard diary={diary} lang={lang} />
    </div>
  );
}

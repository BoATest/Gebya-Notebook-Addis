import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Users, Calendar, Settings, Trash2, Pencil } from 'lucide-react';
import db from './db';
import { PrivacyProvider, usePrivacy } from './context/PrivacyContext';
import ProfitCard from './components/ProfitCard';
import TransactionForm from './components/TransactionForm';
import EditTransactionSheet from './components/EditTransactionSheet';
import MerroList from './components/MerroList';
import CreditDetail from './components/CreditDetail';
import HistoryView from './components/HistoryView';
import SettingsPage from './components/SettingsPage';
import OnboardingScreen from './components/OnboardingScreen';
import { DEFAULT_PROVIDERS } from './components/PaymentTypeChips';
import { getCurrentEthiopianDate, formatEthiopian } from './utils/ethiopianCalendar';
import { fmt } from './utils/format';

const P = {
  bg: '#fdf8f0',
  header: '#7c3d12',
  actionBar: '#9a4c18',
  amber: '#c47c1a',
  amberLight: '#fef3c7',
  border: '#f0e6d4',
};

function AppInner() {
  const { hidden } = usePrivacy();
  const [transactions, setTransactions] = useState([]);
  const [creditRecords, setCreditRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [showForm, setShowForm] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [shopProfile, setShopProfile] = useState(null);
  const [enabledProviders, setEnabledProviders] = useState(DEFAULT_PROVIDERS);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [lastPayment, setLastPayment] = useState({
    sale:    { type: 'cash', provider: '', bankProvider: '', walletProvider: '' },
    expense: { type: 'cash', provider: '', bankProvider: '', walletProvider: '' },
  });
  const [usageStats, setUsageStats] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [txns, credits, nameRow, phoneRow, epRow, reRow] = await Promise.all([
        db.transactions.toArray(),
        db.credit_records.toArray(),
        db.settings.get('shop_name'),
        db.settings.get('shop_phone'),
        db.settings.get('enabled_payment_methods'),
        db.settings.get('recurring_expenses'),
      ]);
      txns.sort((a, b) => b.created_at - a.created_at);
      setTransactions(txns);
      setCreditRecords(credits);
      setShopProfile({
        name: nameRow?.value || null,
        phone: phoneRow?.value || '',
      });
      try { setEnabledProviders(epRow ? JSON.parse(epRow.value) : DEFAULT_PROVIDERS); } catch { setEnabledProviders(DEFAULT_PROVIDERS); }
      try { setRecurringExpenses(reRow ? JSON.parse(reRow.value) : []); } catch { setRecurringExpenses([]); }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const trackSession = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [scRow, ladRow, sdRow, lsdRow, daRow, fcRow, fudRow] = await Promise.all([
        db.analytics.get('session_count'),
        db.analytics.get('last_active_date'),
        db.analytics.get('streak_days'),
        db.analytics.get('longest_streak'),
        db.analytics.get('days_active'),
        db.analytics.get('feature_counts'),
        db.analytics.get('first_used_date'),
      ]);

      const sessionCount = (scRow?.value || 0) + 1;
      const lastDate = ladRow?.value || null;
      const isNewDay = lastDate !== todayStr;

      let streak = sdRow?.value || 1;
      let longestStreak = lsdRow?.value || 1;
      if (isNewDay) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        streak = lastDate === yesterdayStr ? streak + 1 : 1;
        longestStreak = Math.max(longestStreak, streak);
      }

      let daysActive = [];
      try { daysActive = daRow ? JSON.parse(daRow.value) : []; } catch { daysActive = []; }
      if (isNewDay && !daysActive.includes(todayStr)) daysActive = [...daysActive, todayStr];

      let featureCounts = { sales: 0, expenses: 0, credits: 0 };
      try { featureCounts = fcRow ? JSON.parse(fcRow.value) : featureCounts; } catch { /* keep default */ }

      const firstUsed = fudRow?.value || todayStr;

      await Promise.all([
        db.analytics.put({ key: 'session_count',   value: sessionCount }),
        db.analytics.put({ key: 'last_active_date', value: todayStr }),
        db.analytics.put({ key: 'streak_days',      value: streak }),
        db.analytics.put({ key: 'longest_streak',   value: longestStreak }),
        db.analytics.put({ key: 'days_active',      value: JSON.stringify(daysActive) }),
        db.analytics.put({ key: 'feature_counts',   value: JSON.stringify(featureCounts) }),
        db.analytics.put({ key: 'first_used_date',  value: firstUsed }),
      ]);

      setUsageStats({ sessionCount, streak, longestStreak, daysActive, featureCounts, firstUsed });
    } catch (err) {
      console.error('Analytics tracking failed:', err);
    }
  }, []);

  useEffect(() => { trackSession(); }, [trackSession]);

  const handleAddTransaction = async (transaction) => {
    try {
      const now = new Date(transaction.created_at);
      const newTxn = {
        ...transaction,
        ethiopian_date: formatEthiopian(now),
        customer_name: transaction.type === 'credit' ? transaction.item_name : null,
      };

      if (transaction.type === 'credit') {
        const customerId = await db.customers.add({
          name: transaction.item_name,
          phone: transaction.customer_phone || null,
          total_debt: transaction.amount,
        });
        await db.credit_records.add({
          customer_id: customerId,
          customer_name: transaction.item_name,
          customer_phone: transaction.customer_phone || null,
          original_amount: transaction.amount,
          paid_amount: 0,
          remaining_amount: transaction.amount,
          due_date: transaction.due_date,
          status: 'active',
          created_at: transaction.created_at,
          direction: transaction.direction || 'owes_me',
        });
      }

      const id = await db.transactions.add(newTxn);
      const saved = await db.transactions.get(id);
      setTransactions(prev => [saved, ...prev]);
      if (transaction.type === 'credit') {
        setCreditRecords(await db.credit_records.toArray());
      }

      if (transaction.type === 'sale' || transaction.type === 'expense') {
        const pType = transaction.payment_type || 'cash';
        const pProvider = transaction.payment_provider || '';
        setLastPayment(prev => {
          const prev_cat = prev[transaction.type] || {};
          return {
            ...prev,
            [transaction.type]: {
              type: pType,
              provider: pProvider,
              bankProvider:   pType === 'bank'   ? pProvider : (prev_cat.bankProvider   || ''),
              walletProvider: pType === 'wallet' ? pProvider : (prev_cat.walletProvider || ''),
            },
          };
        });
      }

      const fcKey = { sale: 'sales', expense: 'expenses', credit: 'credits' }[transaction.type];
      if (fcKey) {
        try {
          const fcRow = await db.analytics.get('feature_counts');
          let fc = { sales: 0, expenses: 0, credits: 0 };
          try { fc = fcRow ? JSON.parse(fcRow.value) : fc; } catch { /* keep default */ }
          fc[fcKey] = (fc[fcKey] || 0) + 1;
          await db.analytics.put({ key: 'feature_counts', value: JSON.stringify(fc) });
          setUsageStats(prev => prev ? { ...prev, featureCounts: fc } : prev);
        } catch { /* non-critical */ }
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Could not save. Please try again.');
      throw err;
    }
  };

  const handleUpdateTransaction = async (id, updates) => {
    try {
      await db.transactions.update(id, { ...updates, updated_at: Date.now() });
      const updated = await db.transactions.get(id);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));

      if (updated?.type === 'credit' && updated.customer_name) {
        const matching = await db.credit_records.where('customer_name').equals(updated.customer_name).first();
        if (matching) {
          const creditUpdates = {
            customer_name: updates.item_name || matching.customer_name,
            customer_phone: updates.customer_phone ?? matching.customer_phone,
            due_date: updates.due_date ?? matching.due_date,
            direction: updates.direction ?? matching.direction,
          };
          if (updates.amount !== undefined && updates.amount !== matching.original_amount) {
            const diff = updates.amount - matching.original_amount;
            const newOriginal = updates.amount;
            const newRemaining = Math.max(0, matching.remaining_amount + diff);
            creditUpdates.original_amount = newOriginal;
            creditUpdates.remaining_amount = newRemaining;
            creditUpdates.status = newRemaining <= 0 ? 'paid' : 'active';
          }
          await db.credit_records.update(matching.id, creditUpdates);
          setCreditRecords(await db.credit_records.toArray());
        }
      }
    } catch (err) {
      console.error('Failed to update:', err);
      alert('Could not update. Please try again.');
      throw err;
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await db.transactions.delete(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handlePartialPayment = async (creditId, amount) => {
    try {
      const record = await db.credit_records.get(creditId);
      if (!record) return;
      const newPaid = (record.paid_amount || 0) + amount;
      const newRemaining = record.original_amount - newPaid;
      const newStatus = newRemaining <= 0 ? 'paid' : 'active';
      await db.credit_records.update(creditId, {
        paid_amount: newPaid,
        remaining_amount: Math.max(0, newRemaining),
        status: newStatus,
      });
      const credits = await db.credit_records.toArray();
      setCreditRecords(credits);
      if (selectedCredit?.id === creditId) {
        const updated = credits.find(c => c.id === creditId);
        setSelectedCredit(newStatus === 'paid' ? null : (updated || null));
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

  const handleFullPayment = async (creditId) => {
    try {
      const record = await db.credit_records.get(creditId);
      if (!record) return;
      await db.credit_records.update(creditId, {
        paid_amount: record.original_amount,
        remaining_amount: 0,
        status: 'paid',
      });
      setCreditRecords(await db.credit_records.toArray());
      setSelectedCredit(null);
    } catch (err) {
      console.error('Failed to mark paid:', err);
    }
  };

  const handleProfileSave = async (name, phone) => {
    await db.settings.put({ key: 'shop_name', value: name });
    await db.settings.put({ key: 'shop_phone', value: phone });
    setShopProfile({ name, phone });
  };

  const todayTransactions = transactions.filter(
    t => new Date(t.created_at).toDateString() === new Date().toDateString()
  );

  const hid = (n) => hidden ? '••••' : fmt(n);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: P.bg }}>
        <div className="text-center">
          <div className="text-5xl mb-3">📒</div>
          <h1 className="text-2xl font-black" style={{ color: P.header }}>ገበያ</h1>
          <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>Loading your notebook…</p>
        </div>
      </div>
    );
  }

  if (!shopProfile || !shopProfile.name) {
    return (
      <OnboardingScreen
        onComplete={(profile) => setShopProfile(profile)}
      />
    );
  }

  const tabs = [
    { id: 'today',    label: 'ዛሬ',  sub: 'Today',   icon: BookOpen },
    { id: 'merro',    label: 'ብድር', sub: 'Credit',  icon: Users },
    { id: 'history',  label: 'Report',               icon: Calendar },
    { id: 'settings', label: 'Settings',              icon: Settings },
  ];

  const typeEmoji = { sale: '💰', expense: '🛒', credit: '👥' };
  const typeColor = { sale: '#15803d', expense: '#dc2626', credit: '#c47c1a' };
  const typeBorderColor = { sale: '#86efac', expense: '#fca5a5', credit: '#fcd34d' };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative" style={{ background: P.bg }}>

      <header className="flex-shrink-0 px-5 pt-10 pb-4" style={{ background: P.header }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">ገበያ</h1>
            <p className="text-xs mt-0.5 font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {shopProfile.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-white">{getCurrentEthiopianDate()}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {activeTab === 'today' && (
          <div className="flex gap-2">
            {[
              { label: 'Sales', val: todayTransactions.filter(t => t.type === 'sale').reduce((s, t) => s + (t.amount || 0), 0), color: '#bbf7d0', text: '#14532d' },
              { label: 'Spent', val: todayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0), color: '#fecaca', text: '#991b1b' },
            ].map(s => (
              <div key={s.label} className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: s.color }}>
                <div className="text-xs font-semibold" style={{ color: s.text }}>{s.label}</div>
                <div className="font-black text-sm" style={{ color: s.text }}>{hid(s.val)} birr</div>
              </div>
            ))}
          </div>
        )}
      </header>

      {activeTab === 'today' && (
        <div className="px-4 py-3 flex gap-2 flex-shrink-0" style={{ background: P.actionBar }}>
          {[
            { type: 'sale',    label: 'ሸጠሁ', sub: 'I Sold',  bg: '#14532d', shadow: '#052e16' },
            { type: 'expense', label: 'ወጪ',   sub: 'I Spent', bg: '#991b1b', shadow: '#450a0a' },
            { type: 'credit',  label: 'ብድር',  sub: 'Credit',  bg: '#92400e', shadow: '#431407' },
          ].map(b => (
            <button key={b.type} onClick={() => setShowForm(b.type)}
              className="flex-1 py-3 rounded-2xl text-center active:opacity-80 transition-all"
              style={{ background: b.bg, boxShadow: `0 4px 0 ${b.shadow}` }}>
              <div className="font-black text-white text-lg leading-none">+</div>
              <div className="font-bold text-white text-sm">{b.label}</div>
              <div className="text-white text-xs opacity-70">{b.sub}</div>
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">

        {activeTab === 'today' && (
          <div className="space-y-4">
            <ProfitCard transactions={todayTransactions} />

            <div className="rounded-2xl shadow-sm border overflow-hidden" style={{ background: '#fff', borderColor: P.border }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: P.border }}>
                <h3 className="font-bold text-gray-700 text-sm">
                  Today's Entries
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: P.amberLight, color: P.amber }}>
                    {todayTransactions.length}
                  </span>
                </h3>
              </div>

              {todayTransactions.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-3xl mb-2">📝</p>
                  <p className="text-sm" style={{ color: '#9ca3af' }}>No entries yet. Use the buttons above to start!</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: '#fef9ec' }}>
                  {todayTransactions.map(t => (
                    <div key={t.id}
                      className="px-4 py-3 flex items-center border-l-4"
                      style={{ borderLeftColor: typeBorderColor[t.type] }}>
                      <span className="text-xl mr-3 flex-shrink-0">{typeEmoji[t.type]}</span>
                      <button
                        className="flex-1 min-w-0 text-left"
                        onClick={() => setEditTarget(t)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800 text-sm truncate">{t.item_name}</span>
                          {t.updated_at && <span className="text-xs" style={{ color: '#c47c1a' }}>edited</span>}
                        </div>
                        {t.quantity > 1 && <span className="text-xs text-gray-400">×{t.quantity}</span>}
                        {t.payment_type && t.payment_type !== 'cash' && (
                          <span className="text-xs text-gray-400 block">
                            {[t.payment_type, t.payment_provider].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                      <div className="text-right mr-2 flex-shrink-0">
                        <div className="font-bold text-sm" style={{ color: typeColor[t.type] }}>
                          {t.type === 'expense' ? '-' : ''}{fmt(t.amount || 0)} birr
                        </div>
                        {t.profit !== null && t.profit !== undefined && (
                          <div className={`text-xs ${t.profit >= 0 ? 'text-green-600' : 'text-red-400'}`}>
                            {t.profit >= 0 ? '+' : ''}{fmt(t.profit)} profit
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => setEditTarget(t)}
                          className="p-2 rounded-xl min-w-[36px] min-h-[36px] flex items-center justify-center"
                          style={{ background: '#fffbeb' }}
                          aria-label="Edit entry"
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: '#c47c1a' }} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-2 rounded-xl min-w-[36px] min-h-[36px] flex items-center justify-center"
                          style={{ background: '#fff1f2' }}
                          aria-label="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'merro' && (
          selectedCredit ? (
            <CreditDetail
              record={selectedCredit}
              onBack={() => setSelectedCredit(null)}
              onPartialPayment={handlePartialPayment}
              onFullPayment={handleFullPayment}
            />
          ) : (
            <MerroList
              creditRecords={creditRecords}
              onSelectCredit={setSelectedCredit}
            />
          )
        )}

        {activeTab === 'history' && (
          <HistoryView
            transactions={transactions}
            onEdit={setEditTarget}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            transactions={transactions}
            creditRecords={creditRecords}
            shopProfile={shopProfile}
            onProfileSave={handleProfileSave}
            enabledProviders={enabledProviders}
            onProvidersChange={setEnabledProviders}
            recurringExpenses={recurringExpenses}
            onRecurringChange={setRecurringExpenses}
            usageStats={usageStats}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 border-t"
        style={{ background: '#fff', borderColor: P.border }}>
        <div className="flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedCredit(null); }}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[64px] transition-colors"
                style={{
                  background: isActive ? P.amberLight : 'transparent',
                  borderBottom: isActive ? `3px solid ${P.amber}` : '3px solid transparent',
                  color: isActive ? P.amber : '#9ca3af',
                }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-bold">{tab.label}</span>
                {tab.sub && <span className="text-xs" style={{ opacity: 0.65 }}>{tab.sub}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {showForm && (
        <TransactionForm
          type={showForm}
          onSave={handleAddTransaction}
          onDone={() => setShowForm(null)}
          enabledProviders={enabledProviders}
          recurringExpenses={recurringExpenses}
          initialPaymentType={(showForm === 'sale' || showForm === 'expense') ? lastPayment[showForm]?.type : undefined}
          initialPaymentProvider={(showForm === 'sale' || showForm === 'expense') ? lastPayment[showForm]?.provider : undefined}
          lastPaymentHistory={(showForm === 'sale' || showForm === 'expense') ? {
            bank:   lastPayment[showForm]?.bankProvider   || '',
            wallet: lastPayment[showForm]?.walletProvider || '',
          } : undefined}
        />
      )}

      {editTarget && (
        <EditTransactionSheet
          transaction={editTarget}
          enabledProviders={enabledProviders}
          onUpdate={handleUpdateTransaction}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-3xl text-center mb-3">{typeEmoji[deleteTarget.type]}</div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-1">Delete this entry?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              "{deleteTarget.item_name}" · {fmt(deleteTarget.amount || 0)} birr
            </p>
            <div className="space-y-2">
              <button onClick={() => handleDeleteTransaction(deleteTarget.id)}
                className="w-full p-4 bg-red-500 text-white rounded-2xl font-black min-h-[52px]">
                Delete
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="w-full p-4 rounded-2xl font-bold min-h-[52px]"
                style={{ background: '#f5f5f5', color: '#374151' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <PrivacyProvider>
      <AppInner />
    </PrivacyProvider>
  );
}

export default App;

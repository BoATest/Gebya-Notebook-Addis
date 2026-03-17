import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Users, Calendar, Settings, Trash2 } from 'lucide-react';
import db from './db';
import { PrivacyProvider, usePrivacy } from './context/PrivacyContext';
import ProfitCard from './components/ProfitCard';
import TransactionForm from './components/TransactionForm';
import MerroList from './components/MerroList';
import CreditDetail from './components/CreditDetail';
import HistoryView from './components/HistoryView';
import SettingsPage from './components/SettingsPage';
import { getCurrentEthiopianDate, formatEthiopian } from './utils/ethiopianCalendar';

// ── Palette (Tej House warm amber) ──────────────────────────────────────────
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

  const loadData = useCallback(async () => {
    try {
      const [txns, credits] = await Promise.all([
        db.transactions.toArray(),
        db.credit_records.toArray(),
      ]);
      txns.sort((a, b) => b.created_at - a.created_at);
      setTransactions(txns);
      setCreditRecords(credits);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
        });
      }

      const id = await db.transactions.add(newTxn);
      const saved = await db.transactions.get(id);
      setTransactions(prev => [saved, ...prev]);
      if (transaction.type === 'credit') {
        setCreditRecords(await db.credit_records.toArray());
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Could not save. Please try again.');
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

  const todayTransactions = transactions.filter(
    t => new Date(t.created_at).toDateString() === new Date().toDateString()
  );

  const m = (n) => hidden ? '••••' : n.toLocaleString();

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

  const tabs = [
    { id: 'today',   label: 'ዛሬ',   sub: 'Today',   icon: BookOpen },
    { id: 'merro',   label: 'ሜሮ',   sub: 'Credit',  icon: Users },
    { id: 'history', label: 'ታሪክ',  sub: 'History', icon: Calendar },
    { id: 'settings',label: 'ቅንጅት', sub: 'Settings', icon: Settings },
  ];

  const typeEmoji = { sale: '💰', expense: '🛒', credit: '👥' };
  const typeColor = { sale: '#15803d', expense: '#dc2626', credit: '#c47c1a' };
  const typeBorderColor = { sale: '#86efac', expense: '#fca5a5', credit: '#fcd34d' };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative" style={{ background: P.bg }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 px-5 pt-10 pb-4" style={{ background: P.header }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">ገበያ</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Business Notebook</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-white">{getCurrentEthiopianDate()}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Quick stats row */}
        {activeTab === 'today' && (
          <div className="flex gap-2">
            {[
              { label: 'Sales', val: todayTransactions.filter(t => t.type === 'sale').reduce((s, t) => s + (t.amount || 0), 0), color: '#bbf7d0', text: '#14532d' },
              { label: 'Spent', val: todayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0), color: '#fecaca', text: '#991b1b' },
            ].map(s => (
              <div key={s.label} className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: s.color }}>
                <div className="text-xs font-semibold" style={{ color: s.text }}>{s.label}</div>
                <div className="font-black text-sm" style={{ color: s.text }}>{m(s.val)} birr</div>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── Action buttons (Today only) ───────────────────────────────────── */}
      {activeTab === 'today' && (
        <div className="px-4 py-3 flex gap-2 flex-shrink-0" style={{ background: P.actionBar }}>
          {[
            { type: 'sale',    label: 'ሸጠሁ', sub: 'I Sold',   bg: '#14532d', shadow: '#052e16' },
            { type: 'expense', label: 'ወጪ',   sub: 'I Spent',  bg: '#991b1b', shadow: '#450a0a' },
            { type: 'credit',  label: 'ሜሮ',   sub: 'Credit',   bg: '#92400e', shadow: '#431407' },
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

      {/* ── Content ───────────────────────────────────────────────────────── */}
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
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-800 text-sm truncate block">{t.item_name}</span>
                        {t.quantity > 1 && <span className="text-xs text-gray-400">×{t.quantity}</span>}
                      </div>
                      <div className="text-right mr-2 flex-shrink-0">
                        <div className="font-bold text-sm" style={{ color: typeColor[t.type] }}>
                          {t.type === 'expense' ? '-' : ''}{m(t.amount || 0)} birr
                        </div>
                        {t.profit !== null && t.profit !== undefined && (
                          <div className={`text-xs ${t.profit >= 0 ? 'text-green-600' : 'text-red-400'}`}>
                            {t.profit >= 0 ? '+' : ''}{m(t.profit)} profit
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="p-2 rounded-xl flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
                        style={{ background: '#fff1f2' }}
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
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
          <HistoryView transactions={transactions} />
        )}

        {activeTab === 'settings' && (
          <SettingsPage transactions={transactions} creditRecords={creditRecords} />
        )}
      </main>

      {/* ── Bottom nav ────────────────────────────────────────────────────── */}
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
                <span className="text-xs" style={{ opacity: 0.65 }}>{tab.sub}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Transaction form ──────────────────────────────────────────────── */}
      {showForm && (
        <TransactionForm
          type={showForm}
          onSave={(txn) => { handleAddTransaction(txn); setShowForm(null); }}
          onCancel={() => setShowForm(null)}
        />
      )}

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-3xl text-center mb-3">{typeEmoji[deleteTarget.type]}</div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-1">Delete this entry?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              "{deleteTarget.item_name}" · {(deleteTarget.amount || 0).toLocaleString()} birr
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

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Users, Calendar } from 'lucide-react';
import db from './db';
import ProfitCard from './components/ProfitCard';
import TransactionForm from './components/TransactionForm';
import MerroList from './components/MerroList';
import CreditDetail from './components/CreditDetail';
import HistoryView from './components/HistoryView';
import { getCurrentEthiopianDate, formatEthiopian } from './utils/ethiopianCalendar';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [creditRecords, setCreditRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [showForm, setShowForm] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          phone: null,
          total_debt: transaction.amount,
        });

        const creditRecord = {
          customer_id: customerId,
          customer_name: transaction.item_name,
          original_amount: transaction.amount,
          paid_amount: 0,
          remaining_amount: transaction.amount,
          due_date: transaction.due_date,
          status: 'active',
          created_at: transaction.created_at,
        };

        await db.credit_records.add(creditRecord);
      }

      const id = await db.transactions.add(newTxn);
      const saved = await db.transactions.get(id);

      setTransactions(prev => [saved, ...prev]);

      if (transaction.type === 'credit') {
        const credits = await db.credit_records.toArray();
        setCreditRecords(credits);
      }
    } catch (err) {
      console.error('Failed to save transaction:', err);
      alert('Could not save. Please try again.');
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

      if (selectedCredit && selectedCredit.id === creditId) {
        const updated = credits.find(c => c.id === creditId);
        setSelectedCredit(updated || null);
        if (newStatus === 'paid') setSelectedCredit(null);
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

      const credits = await db.credit_records.toArray();
      setCreditRecords(credits);
      setSelectedCredit(null);
    } catch (err) {
      console.error('Failed to mark paid:', err);
    }
  };

  const todayTransactions = transactions.filter(t => {
    return new Date(t.created_at).toDateString() === new Date().toDateString();
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">📒</div>
          <h1 className="text-2xl font-bold text-gray-800">ገበያ</h1>
          <p className="text-gray-400 text-sm mt-2">Loading your notebook...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'today', label: 'Today', icon: BookOpen },
    { id: 'merro', label: 'Merro', icon: Users },
    { id: 'history', label: 'History', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      <header className="bg-slate-800 text-white px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ገበያ</h1>
            <p className="text-slate-400 text-xs mt-0.5">Gebya — Business Notebook</p>
          </div>
          <div className="text-right">
            <p className="text-slate-300 text-xs">{getCurrentEthiopianDate()}</p>
            <p className="text-slate-400 text-xs">{new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {activeTab === 'today' && (
          <div className="space-y-4">
            <ProfitCard transactions={todayTransactions} />

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setShowForm('sale')}
                className="bg-emerald-500 text-white p-4 rounded-2xl font-medium flex flex-col items-center gap-1.5 active:scale-95 transition-all min-h-[80px] shadow-sm"
              >
                <span className="text-2xl">💰</span>
                <span className="text-xs font-semibold">I Sold</span>
              </button>
              <button
                onClick={() => setShowForm('expense')}
                className="bg-red-500 text-white p-4 rounded-2xl font-medium flex flex-col items-center gap-1.5 active:scale-95 transition-all min-h-[80px] shadow-sm"
              >
                <span className="text-2xl">🛒</span>
                <span className="text-xs font-semibold">I Spent</span>
              </button>
              <button
                onClick={() => setShowForm('credit')}
                className="bg-blue-500 text-white p-4 rounded-2xl font-medium flex flex-col items-center gap-1.5 active:scale-95 transition-all min-h-[80px] shadow-sm"
              >
                <span className="text-2xl">👥</span>
                <span className="text-xs font-semibold">Credit</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h3 className="font-semibold text-gray-700 text-sm">
                  Today's Entries
                  <span className="ml-2 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                    {todayTransactions.length}
                  </span>
                </h3>
              </div>
              {todayTransactions.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-gray-300 text-3xl mb-2">📝</p>
                  <p className="text-gray-400 text-sm">No entries yet. Start tracking!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {todayTransactions.map(t => (
                    <div key={t.id} className={`px-4 py-3 flex justify-between items-center border-l-4 ${
                      t.type === 'sale' ? 'border-emerald-400' :
                      t.type === 'expense' ? 'border-red-400' : 'border-blue-400'
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg flex-shrink-0">
                          {t.type === 'sale' ? '💰' : t.type === 'expense' ? '🛒' : '👥'}
                        </span>
                        <div className="min-w-0">
                          <span className="font-medium text-gray-800 text-sm truncate block">{t.item_name}</span>
                          {t.quantity > 1 && (
                            <span className="text-xs text-gray-400">×{t.quantity}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className={`font-semibold text-sm ${
                          t.type === 'sale' ? 'text-emerald-600' :
                          t.type === 'expense' ? 'text-red-500' : 'text-blue-600'
                        }`}>
                          {t.type === 'expense' ? '-' : ''}{(t.amount || 0).toLocaleString()} birr
                        </div>
                        {t.profit !== null && t.profit !== undefined && (
                          <div className={`text-xs ${t.profit >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {t.profit >= 0 ? '+' : ''}{t.profit.toLocaleString()} profit
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'merro' && (
          <div>
            {selectedCredit ? (
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
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryView transactions={transactions} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 z-40">
        <div className="flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedCredit(null); }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 min-h-[64px] transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showForm && (
        <TransactionForm
          type={showForm}
          onSave={(transaction) => {
            handleAddTransaction(transaction);
            setShowForm(null);
          }}
          onCancel={() => setShowForm(null)}
        />
      )}
    </div>
  );
}

export default App;

import { useState } from 'react';
import { Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { getCreditStatus, formatEthiopianShort } from '../utils/ethiopianCalendar';
import { fmt } from '../utils/format';

function MerroList({ creditRecords, onSelectCredit }) {
  const [showPaid, setShowPaid] = useState(false);

  const active = creditRecords.filter(r => r.status !== 'paid');
  const paid = creditRecords.filter(r => r.status === 'paid');
  const list = showPaid ? paid : active;
  const total = active.reduce((sum, r) => sum + (r.remaining_amount || 0), 0);

  const colorMap = {
    red: { card: 'border-red-300 bg-red-50', dot: 'bg-red-500' },
    yellow: { card: 'border-amber-300 bg-amber-50', dot: 'bg-amber-500' },
    green: { card: 'border-emerald-300 bg-emerald-50', dot: 'bg-emerald-500' },
  };

  if (active.length === 0 && paid.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="w-16 h-16 mb-4" style={{ color: '#e5e7eb' }} />
        <p className="text-lg font-medium" style={{ color: '#9ca3af' }}>No credit records</p>
        <p className="text-sm mt-1" style={{ color: '#d1d5db' }}>Tap "ብድር" on the Today tab to add one</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 border" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fde68a' }}>
              <Users className="w-5 h-5" style={{ color: '#92400e' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>Total owed to you</p>
              <p className="text-2xl font-black" style={{ color: '#78350f' }}>{fmt(total)} birr</p>
            </div>
          </div>
          <div className="text-right text-xs" style={{ color: '#9ca3af' }}>
            <div>{active.length} active</div>
            {paid.length > 0 && <div>{paid.length} paid</div>}
          </div>
        </div>
      </div>

      {paid.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaid(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: !showPaid ? '#c47c1a' : '#f5f5f5',
              color: !showPaid ? '#fff' : '#6b7280',
            }}
          >
            Active ({active.length})
          </button>
          <button
            onClick={() => setShowPaid(true)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: showPaid ? '#c47c1a' : '#f5f5f5',
              color: showPaid ? '#fff' : '#6b7280',
            }}
          >
            Paid ({paid.length})
          </button>
        </div>
      )}

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="text-center py-10">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#d1d5db' }} />
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {showPaid ? 'No paid records yet' : 'All caught up!'}
            </p>
          </div>
        )}

        {list.map(record => {
          if (showPaid) {
            return (
              <div key={record.id} className="rounded-2xl border px-4 py-3 flex items-center gap-3"
                style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{record.customer_name}</p>
                  <p className="text-xs text-gray-400">Paid in full · {fmt(record.original_amount)} birr</p>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">PAID</span>
              </div>
            );
          }

          const status = getCreditStatus(record.due_date);
          const colors = colorMap[status.color];
          return (
            <button
              key={record.id}
              onClick={() => onSelectCredit(record)}
              className={`w-full text-left p-4 rounded-2xl border-l-4 flex items-center justify-between transition-all active:scale-95 min-h-[72px] ${colors.card}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colors.dot}`} />
                <div>
                  <p className="font-bold text-gray-800 text-base">{record.customer_name}</p>
                  <p className="text-sm text-gray-500">
                    Due {record.due_date ? formatEthiopianShort(record.due_date) : '—'}
                    {record.paid_amount > 0 && (
                      <span className="ml-2 text-gray-400">· Paid {fmt(record.paid_amount)}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-bold text-gray-800 text-base">{fmt(record.remaining_amount || 0)} birr</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MerroList;

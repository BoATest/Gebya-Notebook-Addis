import { Users, Phone, CheckCircle2, DollarSign, ChevronRight } from 'lucide-react';
import { getCreditStatus, formatEthiopianShort } from '../utils/ethiopianCalendar';

function MerroList({ creditRecords, onSelectCredit }) {
  const active = creditRecords.filter(r => r.status !== 'paid');
  const total = active.reduce((sum, r) => sum + (r.remaining_amount || 0), 0);

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="w-16 h-16 text-gray-200 mb-4" />
        <p className="text-gray-400 text-lg font-medium">No credit records</p>
        <p className="text-gray-300 text-sm mt-1">Tap "Credit" on the Today tab to add one</p>
      </div>
    );
  }

  const colorMap = {
    red: 'border-red-400 bg-red-50',
    yellow: 'border-amber-400 bg-amber-50',
    green: 'border-emerald-400 bg-emerald-50',
  };

  const dotColorMap = {
    red: 'bg-red-500',
    yellow: 'bg-amber-500',
    green: 'bg-emerald-500',
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm text-blue-600 font-medium">Total Owed to You</p>
            <p className="text-2xl font-bold text-blue-700">{total.toLocaleString()} birr</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {active.map(record => {
          const status = getCreditStatus(record.due_date);
          return (
            <button
              key={record.id}
              onClick={() => onSelectCredit(record)}
              className={`w-full text-left p-4 rounded-2xl border-l-4 flex items-center justify-between ${colorMap[status.color]} transition-all active:scale-95 min-h-[72px]`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColorMap[status.color]}`} />
                <div>
                  <p className="font-bold text-gray-800 text-base">{record.customer_name}</p>
                  <p className="text-sm text-gray-500">
                    Due {record.due_date ? formatEthiopianShort(record.due_date) : '—'}
                    {record.paid_amount > 0 && (
                      <span className="ml-2 text-gray-400">· Paid {record.paid_amount.toLocaleString()}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-bold text-gray-800 text-base">{(record.remaining_amount || 0).toLocaleString()} birr</span>
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

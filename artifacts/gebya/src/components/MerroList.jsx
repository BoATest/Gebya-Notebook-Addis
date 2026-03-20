import { useState } from 'react';
import { Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { getCreditStatus, formatEthiopianShort } from '../utils/ethiopianCalendar';
import { fmt } from '../utils/numformat';

function MerroList({ creditRecords, onSelectCredit }) {
  const { t } = useLang();
  const [showPaid, setShowPaid] = useState(false);

  const active = creditRecords.filter(r => r.status !== 'paid');
  const paid = creditRecords.filter(r => r.status === 'paid');
  const list = showPaid ? paid : active;

  const owedToMe  = active.filter(r => !r.direction || r.direction === 'owes_me').reduce((s, r) => s + (r.remaining_amount || 0), 0);
  const iOwe      = active.filter(r => r.direction === 'i_owe').reduce((s, r) => s + (r.remaining_amount || 0), 0);

  function getStatusDisplay(status) {
    if (status.label === 'Overdue') {
      return {
        card: 'border-red-300 bg-red-50',
        badge: { bg: '#fee2e2', color: '#b91c1c' },
        text: t.statusOverdue,
      };
    }
    if (status.color === 'green') {
      return {
        card: 'border-emerald-300 bg-emerald-50',
        badge: { bg: '#d1fae5', color: '#065f46' },
        text: t.statusOk,
      };
    }
    return {
      card: 'border-yellow-300 bg-yellow-50',
      badge: { bg: 'rgba(196,136,58,0.15)', color: '#8a5e1a' },
      text: t.statusDueSoon,
    };
  }

  if (active.length === 0 && paid.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="w-16 h-16 mb-4" style={{ color: '#e5e7eb' }} />
        <p className="text-lg font-medium" style={{ color: '#9ca3af' }}>{t.noCreditRecords}</p>
        <p className="text-sm mt-1" style={{ color: '#d1d5db' }}>{t.addCreditHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="p-4 border animate-elastic texture-noise" style={{ background: 'rgba(27,67,50,0.06)', borderColor: 'rgba(27,67,50,0.2)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center" style={{ background: '#1B4332', borderRadius: 'var(--radius-sm)' }}>
              <Users className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1B4332' }}>{t.owedToMe}</p>
              <p className="text-2xl font-black" style={{ color: '#1B4332' }}>{fmt(owedToMe)} {t.birr}</p>
            </div>
          </div>
          <div className="text-right">
            {iOwe > 0 && (
              <div className="mb-1">
                <p className="text-xs font-semibold text-red-500">{t.iOweAmount}</p>
                <p className="text-sm font-black text-red-600">{fmt(iOwe)} {t.birr}</p>
              </div>
            )}
            <div className="text-xs" style={{ color: '#9ca3af' }}>
              <div>{active.length} {t.active}</div>
              {paid.length > 0 && <div>{paid.length} {t.paid}</div>}
            </div>
          </div>
        </div>
      </div>

      {paid.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaid(false)}
            className="flex-1 py-2.5 text-sm font-bold transition-all press-scale"
            style={{ background: !showPaid ? '#1B4332' : '#f5f5f5', color: !showPaid ? '#fff' : '#6b7280', borderRadius: 'var(--radius-sm)' }}
          >
            {t.activeTab} ({active.length})
          </button>
          <button
            onClick={() => setShowPaid(true)}
            className="flex-1 py-2.5 text-sm font-bold transition-all press-scale"
            style={{ background: showPaid ? '#1B4332' : '#f5f5f5', color: showPaid ? '#fff' : '#6b7280', borderRadius: 'var(--radius-sm)' }}
          >
            {t.paidTab} ({paid.length})
          </button>
        </div>
      )}

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="text-center py-10">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#d1d5db' }} />
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {showPaid ? t.noPaidRecords : t.allCaughtUp}
            </p>
          </div>
        )}

        {list.map(record => {
          if (showPaid) {
            return (
              <div key={record.id} className="border px-4 py-3 flex items-center gap-3 animate-slide-up"
                style={{ background: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}>
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{record.customer_name}</p>
                  <p className="text-xs text-gray-400">{t.paidInFull} · {fmt(record.original_amount)} {t.birr}</p>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">{t.paidLabel}</span>
              </div>
            );
          }

          const status = getCreditStatus(record.due_date);
          const iOweRecord = record.direction === 'i_owe';
          const display = getStatusDisplay(status);

          return (
            <button
              key={record.id}
              onClick={() => onSelectCredit(record)}
              className={`w-full text-left p-4 border-l-4 flex items-center justify-between transition-all active:scale-95 min-h-[72px] press-scale animate-slide-up ${display.card}`}
              style={{ borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-black px-2 py-1 flex-shrink-0"
                  style={{ background: display.badge.bg, color: display.badge.color, minWidth: '60px', textAlign: 'center', letterSpacing: '0.02em', borderRadius: 'var(--radius-sm)' }}
                >
                  {display.text}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800 text-base">{record.customer_name}</p>
                    {iOweRecord ? (
                      <span className="px-1.5 py-0.5 text-xs font-bold" style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '4px' }}>
                        {t.iOweTag}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-xs font-bold" style={{ background: '#d1fae5', color: '#065f46', borderRadius: '4px' }}>
                        {t.owesMeLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {t.due} {record.due_date ? formatEthiopianShort(record.due_date) : '—'}
                    {record.paid_amount > 0 && (
                      <span className="ml-2 text-gray-400">· {t.paid} {fmt(record.paid_amount)}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-bold text-gray-800 text-base">{fmt(record.remaining_amount || 0)} {t.birr}</span>
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

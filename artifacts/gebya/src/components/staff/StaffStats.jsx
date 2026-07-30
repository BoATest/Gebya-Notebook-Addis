import { fmt } from '../../utils/numformat';

export default function StaffStats({ snapshotStats, t }) {
  return (
    <div className="flex gap-2">
      <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }}>
        <div className="text-lg font-black" style={{ color: 'var(--color-primary)' }}>{snapshotStats.unsettledCount}</div>
        <div className="text-[10px] font-bold text-gray-500">{t('Unsettled', 'ያልተስተካከለ')}</div>
      </div>
      <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{
        borderColor: snapshotStats.submittedCount > 0 ? 'var(--color-info-border)' : 'var(--color-border)',
        background: snapshotStats.submittedCount > 0 ? 'var(--color-bg-accent-blue)' : 'var(--color-surface-alt)'
      }}>
        <div className="text-lg font-black" style={{ color: snapshotStats.submittedCount > 0 ? 'var(--color-info)' : 'var(--color-text-muted)' }}>
          {snapshotStats.submittedCount}
        </div>
        <div className="text-[10px] font-bold text-gray-500">{t('Submitted', 'የላኩ')}</div>
      </div>
      <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }}>
        <div className="text-lg font-black" style={{ color: 'var(--color-primary)' }}>{snapshotStats.finalizedCount}</div>
        <div className="text-[10px] font-bold text-gray-500">{t('Finalized', 'የተጠናቀቀ')}</div>
      </div>
      <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }}>
        <div className="text-lg font-black" style={{ color: 'var(--color-primary)' }}>{fmt(snapshotStats.totalCollected)}</div>
        <div className="text-[10px] font-bold text-gray-500">{t('Collected', 'የተሰበሰበ')}</div>
      </div>
    </div>
  );
}

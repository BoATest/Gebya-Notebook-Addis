export default function StaffDeviceManager({ pendingDevices, onApproveDevice, onRejectDevice, t }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-700 mb-2">{t('Device Management', 'የመሳሪያ አስተዳደር')}</div>
      {pendingDevices.length === 0 ? (
        <div className="text-xs text-gray-400">{t('No pending devices', 'በመጠባበቅ ላይ ያሉ መሳሪያዎች የሉም')}</div>
      ) : (
        <div className="space-y-2">
          {pendingDevices.map(d => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border px-3 py-2.5"
              style={{ borderColor: 'var(--color-warning-border)', background: 'var(--color-bg-accent-amber)' }}>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">{d.device_label || 'Device'}</div>
                <div className="text-xs text-gray-500">{d.staffName} · {t('pending', 'በመጠባበቅ')}</div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => onApproveDevice?.(d.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}>
                  {t('Approve', 'አረጋግጥ')}
                </button>
                <button onClick={() => onRejectDevice?.(d.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                  {t('Reject', 'አቁም')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

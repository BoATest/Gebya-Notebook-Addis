import { useState, useEffect } from 'react';
import { useStaffStore } from '../../stores/staffStore';
import { apiFetch } from '../../utils/shared-ui.jsx';
import { fireToast } from '../Toast';

export default function StaffAttendance({ staff, lang, canManageTeam }) {
  const t = (en, am) => lang === 'am' ? am : en;
  const store = useStaffStore();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const loadRecords = async () => {
    if (!staff?.id) return;
    setLoading(true);
    try {
      const from = new Date(Date.now() - 30 * 86400000).toISOString();
      const to = new Date().toISOString();
      const data = await apiFetch(`/attendance?staff_id=${staff.id}&from=${from}&to=${to}`);
      setRecords(data.attendance || []);
      const latest = data.attendance?.find(r => !r.clockOut);
      setActiveSession(latest || null);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadRecords(); }, [staff?.id]);

  const handleClockIn = async () => {
    try {
      const data = await apiFetch('/attendance/clock-in', {
        method: 'POST',
        body: JSON.stringify({ staffId: staff.id }),
      });
      fireToast(t('Clocked in', 'ገባ'), 1800);
      loadRecords();
    } catch (err) {
      fireToast(err.message || 'Failed', 2400);
    }
  };

  const handleClockOut = async () => {
    try {
      await apiFetch('/attendance/clock-out', {
        method: 'POST',
        body: JSON.stringify({ staffId: staff.id }),
      });
      fireToast(t('Clocked out', 'ወጣ'), 1800);
      loadRecords();
    } catch (err) {
      fireToast(err.message || 'Failed', 2400);
    }
  };

  const formatDuration = (clockIn, clockOut) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diff = Math.floor((end - start) / 1000 / 60);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  if (!canManageTeam) return null;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-alt)' }}>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {t('Attendance', 'መግቢያ መውጫ')}
        </span>
        <div className="flex gap-2">
          {!activeSession ? (
            <button onClick={handleClockIn} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}>
              {t('Clock In', 'ግባ')}
            </button>
          ) : (
            <button onClick={handleClockOut} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              {t('Clock Out', 'ውጣ')}
            </button>
          )}
        </div>
      </div>

      {activeSession && (
        <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-success-bg)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--color-success-text)' }}>
            {t('Currently working', 'እየሠሩ ነው')} · {formatDuration(activeSession.clockIn, null)}
          </span>
        </div>
      )}

      <div className="divide-y max-h-60 overflow-y-auto" style={{ borderColor: 'var(--color-border-light)' }}>
        {loading ? (
          <div className="px-4 py-3 text-xs text-gray-400">...</div>
        ) : records.length === 0 ? (
          <div className="px-4 py-3 text-xs text-gray-400">{t('No attendance records', 'የመግቢያ መውጫ ምዝገቦች የሉም')}</div>
        ) : (
          records.slice(0, 20).map(record => (
            <div key={record.id} className="px-4 py-2 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-900">
                  {new Date(record.clockIn).toLocaleDateString()} {new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' → '}
                  {record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('Now', 'አሁን')}
                </div>
                <div className="text-[10px] text-gray-500">
                  {formatDuration(record.clockIn, record.clockOut)}
                </div>
              </div>
              {record.clockOut && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
                  {t('Completed', 'ተጠናቀቀ')}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
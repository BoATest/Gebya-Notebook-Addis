import { useState } from 'react';
import { usePrivacy } from '../context/PrivacyContext';

export default function StaffReportSheet({
  staffRows,
  closingState,
  lang,
  onStaffConfirm,
}) {
  const { hidden } = usePrivacy();
  const [localReports, setLocalReports] = useState({});

  if (!staffRows || staffRows.length === 0) return null;

  const handleCashChange = (staffId, value) => {
    setLocalReports(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], cashReceived: Number(value) || 0, staffId },
    }));
  };

  const handleDigitalChange = (staffId, value) => {
    setLocalReports(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], digitalReceived: Number(value) || 0, staffId },
    }));
  };

  const handleConfirm = (staffId) => {
    const report = localReports[staffId] || {};
    onStaffConfirm?.(staffId, {
      cashReceived: Number(report.cashReceived) || 0,
      digitalReceived: Number(report.digitalReceived) || 0,
      confirmed: true,
    });
    setLocalReports(prev => {
      const next = { ...prev };
      delete next[staffId];
      return next;
    });
  };

  const totalCashExpected = staffRows.reduce((s, r) => s + (r.cash || 0), 0);
  const totalDigitalExpected = staffRows.reduce((s, r) => s + (r.transfer || 0), 0);
  const totalCashConfirmed = staffRows
    .filter(r => closingState.staffReports?.[r.id]?.confirmed)
    .reduce((s, r) => s + (closingState.staffReports[r.id].cashReceived || 0), 0);
  const totalDigitalConfirmed = staffRows
    .filter(r => closingState.staffReports?.[r.id]?.confirmed)
    .reduce((s, r) => s + (closingState.staffReports[r.id].digitalReceived || 0), 0);

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 900, color: '#1f2937', marginBottom: 8 }}>
        {lang === 'am' ? '📋 የሰራተኞች ገንዘብ መሰብሰብ' : '📋 STAFF CASH COLLECTION'}
      </p>

      {staffRows.map(staff => {
        const confirmed = closingState.staffReports?.[staff.id]?.confirmed;
        const local = localReports[staff.id] || {};

        return (
          <div key={staff.id} style={{
            padding: '10px 0',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#1f2937' }}>
                👤 {staff.name}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280' }}>
                {staff.records} {lang === 'am' ? 'ሽያጮች' : 'sales'}
              </span>
            </div>

            {confirmed ? (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
                ✅ {lang === 'am' ? 'ተረጋግጧል' : 'Confirmed'} —
                {lang === 'am'
                  ? ` ጥሬ፦ ${closingState.staffReports[staff.id].cashReceived?.toLocaleString()} · ዲጂ፦ ${closingState.staffReports[staff.id].digitalReceived?.toLocaleString()}`
                  : ` Cash: ${closingState.staffReports[staff.id].cashReceived?.toLocaleString()} · Digital: ${closingState.staffReports[staff.id].digitalReceived?.toLocaleString()}`}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                  {lang === 'am'
                    ? `ጥሬ ይጠበቃል፦ ${(staff.cash || 0).toLocaleString()} ETB · ዲጂ፦ ${(staff.transfer || 0).toLocaleString()} ETB`
                    : `Cash expected: ${(staff.cash || 0).toLocaleString()} ETB · Digital: ${(staff.transfer || 0).toLocaleString()} ETB`}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder={lang === 'am' ? 'ጥሬ ገንዘብ' : 'Cash received'}
                    value={local.cashReceived ?? ''}
                    onChange={e => handleCashChange(staff.id, e.target.value)}
                    style={{
                      flex: 1, minHeight: 32, padding: '4px 8px',
                      border: '1px solid #e5e7eb', borderRadius: 8,
                      fontSize: 12, fontWeight: 600, outline: 'none',
                    }}
                  />
                  <input
                    type="number"
                    placeholder={lang === 'am' ? 'ዲጂታል' : 'Digital'}
                    value={local.digitalReceived ?? ''}
                    onChange={e => handleDigitalChange(staff.id, e.target.value)}
                    style={{
                      flex: 1, minHeight: 32, padding: '4px 8px',
                      border: '1px solid #e5e7eb', borderRadius: 8,
                      fontSize: 12, fontWeight: 600, outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleConfirm(staff.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: 'none',
                      background: '#1B4332', color: '#fff',
                      fontSize: 11, fontWeight: 800, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ✔
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      <div style={{
        marginTop: 10, padding: 8, background: '#f9fafb', borderRadius: 8,
        fontSize: 11, fontWeight: 700, color: '#4b5563',
      }}>
        {lang === 'am'
          ? `📊 ጠቅላላ ከሰራተኞች፦ ጥሬ ${totalCashConfirmed.toLocaleString()} / ${totalCashExpected.toLocaleString()} · ዲጂ ${totalDigitalConfirmed.toLocaleString()} / ${totalDigitalExpected.toLocaleString()}`
          : `📊 Total from staff: Cash ${totalCashConfirmed.toLocaleString()} / ${totalCashExpected.toLocaleString()} · Digital ${totalDigitalConfirmed.toLocaleString()} / ${totalDigitalExpected.toLocaleString()}`}
      </div>
    </div>
  );
}

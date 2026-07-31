// StaffSection.jsx — "How is everyone doing?"
//
// Only shows if staff exist.
// Shows sales per staff, not rankings.
// Owners don't care who won — they care who balanced.

import { fmt } from '../../utils/numformat';
import Chapter from './Chapter';

function StaffRow({ staff, hidden = false, lang = 'en' }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid #f3f4f6',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--color-success-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 900,
          color: 'var(--color-success)',
          flexShrink: 0,
        }}>
          {(staff.name || 'S').charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {staff.name}
          </p>
          <p style={{ fontSize: 10, color: 'var(--color-text-soft)' }}>
            {staff.records} {lang === 'am' ? 'መዝገብ' : 'entries'}
          </p>
        </div>
      </div>
      <span style={{
        fontSize: 14,
        fontWeight: 900,
        color: 'var(--color-success)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {hidden ? '••••' : fmt(staff.sold)}
      </span>
    </div>
  );
}

export default function StaffSection({ staffSummary, hidden = false, lang = 'en' }) {
  if (!staffSummary || staffSummary.count === 0) return null;

  return (
    <Chapter
      title={lang === 'am' ? 'ሰራተኛ' : 'Staff'}
      subtitle={lang === 'am' ? 'ማን ምን ከፍተዋል?' : 'How is everyone doing?'}
      badge={{ text: `${staffSummary.count}`, color: 'var(--color-primary)' }}
      defaultExpanded={false}
    >
      <div style={{ marginTop: 8 }}>
        {staffSummary.staff.map((staff, i) => (
          <StaffRow key={staff.id || i} staff={staff} hidden={hidden} lang={lang} />
        ))}
      </div>
    </Chapter>
  );
}

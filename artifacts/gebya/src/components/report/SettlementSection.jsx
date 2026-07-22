import { useState, useEffect } from 'react';
import db from '../../db';
import SettlementSheet from './SettlementSheet';
import StaffSettlementList from './StaffSettlementList';
import Chapter from './Chapter';

export default function SettlementSection({ lang = 'en', isStaffView = false }) {
  const [staffList, setStaffList] = useState([]);
  const [settling, setSettling] = useState(null);
  const [viewingSettlement, setViewingSettlement] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const all = await db.staff_members.toArray();
        setStaffList(all.filter(s => s.active !== false));
      } catch {}
    })();
  }, [refreshKey]);

  if (isStaffView) return null;

  const t = (en, am) => lang === 'am' ? am : en;

  const handleViewSettlement = (settlement, staff) => {
    if (!staff) {
      const found = staffList.find(s => String(s.id) === String(settlement.staff_id));
      setViewingSettlement({ settlement, staff: found || { id: settlement.staff_id, displayName: `#${settlement.staff_id}` } });
    } else {
      setViewingSettlement({ settlement, staff });
    }
  };

  const handleSaved = () => {
    setSettling(null);
    setViewingSettlement(null);
    setRefreshKey(k => k + 1);
  };

  const activeSettlement = settling || (viewingSettlement ? viewingSettlement.settlement : null);
  const activeStaff = settling || (viewingSettlement ? viewingSettlement.staff : null);

  return (
    <div id="settlement-section">
    <Chapter
      title={t('Staff Settlement', 'የሰራተኛ ማስተካከያ')}
      subtitle={t('Settle with staff', 'ከሰራተኞች ጋር ማስተካከል')}
      defaultExpanded={true}
    >
      <div style={{ marginTop: 8 }}>
        {activeSettlement ? (
          <SettlementSheet
            staff={activeStaff}
            existingSettlement={viewingSettlement ? viewingSettlement.settlement : null}
            lang={lang}
            onSaved={handleSaved}
            onCancel={() => {
              setSettling(null);
              setViewingSettlement(null);
            }}
          />
        ) : (
          <>
            <StaffSettlementList
              staffRows={staffList}
              lang={lang}
              onSettle={(staff) => {
                setSettling(staff);
                setViewingSettlement(null);
              }}
              onViewSettlement={handleViewSettlement}
              currentSettlingStaff={settling?.id ? String(settling.id) : null}
            />
          </>
        )}
      </div>
    </Chapter>
    </div>
  );
}

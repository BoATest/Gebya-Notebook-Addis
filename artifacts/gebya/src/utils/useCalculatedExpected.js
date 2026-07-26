import { useState, useEffect, useCallback } from 'react';
import { calculateExpected, getLastSettlementPeriod } from './settlementSelectors';

export default function useCalculatedExpected(staffId, existingSettlement) {
  const [loading, setLoading] = useState(true);
  const [expected, setExpected] = useState({ expectedCash: 0, expectedTransfer: 0, expectedTotal: 0, transactionCount: 0 });
  const [period, setPeriod] = useState({ start: 0, end: 0 });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (existingSettlement) {
        const s = existingSettlement;
        setPeriod({ start: s.period_start, end: s.period_end });
        setExpected({
          expectedCash: s.expected_cash || 0,
          expectedTransfer: s.expected_transfer || 0,
          expectedTotal: s.expected_total || 0,
          transactionCount: 0,
        });
      } else {
        const lastSettled = await getLastSettlementPeriod(staffId);
        const periodStart = lastSettled || 0;
        const periodEnd = Date.now();
        setPeriod({ start: periodStart, end: periodEnd });
        const calc = await calculateExpected(String(staffId), periodStart, periodEnd);
        setExpected(calc);
      }
    } catch {
      // error handled upstream
    }
    setLoading(false);
  }, [staffId, existingSettlement]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { expected, period, loading, reload };
}

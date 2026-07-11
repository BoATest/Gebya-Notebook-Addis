import { useState, useCallback, useRef } from 'react';

let rowIdCounter = Date.now();
const nextId = () => `row-${++rowIdCounter}`;

function createBlankRow() {
  return {
    id: nextId(),
    name: '',
    code: '',
    qty: '1',
    price: '',
    lineTotal: 0,
    catalogEntryId: null,
    itemKind: 'item',
  };
}

const UNDO_DURATION = 5000;

export function useSmartSaleRows(initialCount = 3, savedRows = null) {
  const [rows, setRows] = useState(() => {
    if (savedRows && Array.isArray(savedRows) && savedRows.length > 0) {
      return savedRows.map(r => ({ ...createBlankRow(), ...r }));
    }
    return Array.from({ length: initialCount }, () => createBlankRow());
  });
  const [undoStack, setUndoStack] = useState(null);
  const undoTimerRef = useRef(null);

  const ensureEmptyRow = useCallback(() => {
    setRows(prev => {
      const last = prev[prev.length - 1];
      if (last && last.name.trim()) {
        return [...prev, createBlankRow()];
      }
      return prev;
    });
  }, []);

  const updateRow = useCallback((id, field, value) => {
    setRows(prev => {
      const isLastRow = prev[prev.length - 1]?.id === id;
      const wasEmpty = !prev.find(r => r.id === id)?.name?.trim();
      const updated = prev.map(row => {
        if (row.id !== id) return row;
        const r = { ...row, [field]: value };
        if (field === 'qty' || field === 'price') {
          const q = parseFloat(r.qty) || 0;
          const p = parseFloat(r.price) || 0;
          r.lineTotal = Math.round(q * p * 100) / 100;
        }
        return r;
      });
      // Auto-create empty row when merchant starts typing in last row
      if (isLastRow && field === 'name' && wasEmpty && value.trim()) {
        return [...updated, createBlankRow()];
      }
      return updated;
    });
  }, []);

  const deleteRow = useCallback((id) => {
    setRows(prev => {
      const row = prev.find(r => r.id === id);
      if (!row) return prev;
      if (!row.name.trim() && !row.price) {
        return prev.filter(r => r.id !== id);
      }
      // Show undo
      setUndoStack({ type: 'delete', row, index: prev.findIndex(r => r.id === id) });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoStack(null), UNDO_DURATION);
      return prev.filter(r => r.id !== id);
    });
  }, []);

  const undoDelete = useCallback(() => {
    if (!undoStack) return;
    setRows(prev => {
      const newRows = [...prev];
      newRows.splice(undoStack.index, 0, undoStack.row);
      return newRows;
    });
    setUndoStack(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, [undoStack]);

  const addEmptyRows = useCallback((n = 3) => {
    setRows(prev => [...prev, ...Array.from({ length: n }, () => createBlankRow())]);
  }, []);

  const clearRows = useCallback(() => {
    setRows(Array.from({ length: initialCount }, () => createBlankRow()));
  }, [initialCount]);

  const filledRows = rows.filter(r => r.name.trim() || r.price);
  const totalQty = filledRows.reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0);
  const totalAmount = filledRows.reduce((sum, r) => sum + r.lineTotal, 0);

  const buildItemsArray = useCallback(() => {
    return filledRows.map(r => ({
      name: r.name.trim(),
      code: r.code || null,
      amount: r.lineTotal,
      qty: parseFloat(r.qty) || 1,
      unit_price: parseFloat(r.price) || 0,
      line_total: r.lineTotal,
      catalog_entry_id: r.catalogEntryId || null,
      item_kind: r.itemKind || 'item',
      photo_uri: null,
    }));
  }, [filledRows]);

  return {
    rows,
    updateRow,
    deleteRow,
    undoDelete,
    undoStack,
    clearRows,
    addEmptyRows,
    ensureEmptyRow,
    filledRows,
    totalQty,
    totalAmount,
    buildItemsArray,
  };
}

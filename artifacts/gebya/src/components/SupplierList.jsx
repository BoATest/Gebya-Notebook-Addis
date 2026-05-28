// SupplierList.jsx — "people I owe" view (Khatabook-style supplier credit).
// Mirror of CustomerList but reversed semantics: balance > 0 = I owe them.
import { useMemo, useState } from 'react';
import { Plus, Search, Truck } from 'lucide-react';
import { fmt } from '../utils/numformat';
import { useLang } from '../context/LangContext';

function matchesSupplier(supplier, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [supplier.display_name, supplier.note, supplier.phone_number]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

function SupplierList({ suppliers = [], onSelectSupplier, onAddSupplier }) {
  const { t, lang } = useLang();
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const filteredSuppliers = useMemo(
    () => suppliers.filter((s) => matchesSupplier(s, query)),
    [suppliers, query]
  );

  const totalOwed = useMemo(
    () => filteredSuppliers.reduce((sum, s) => sum + (s.balance || 0), 0),
    [filteredSuppliers]
  );

  const suppliersWithBalance = useMemo(
    () => filteredSuppliers.filter((s) => Number(s.balance || 0) > 0).length,
    [filteredSuppliers]
  );

  return (
    <div className="space-y-4">
      {/* Summary card — RED-toned because balance here means MONEY I OWE */}
      <div
        className="p-4 border"
        style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide font-bold" style={{ color: '#9ca3af' }}>
              {lang === 'am' ? 'ለአቅራቢዎች ዱቤ' : "I owe (suppliers)"}
            </p>
            <p className="text-xl font-black" style={{ color: '#dc2626' }}>
              −{fmt(totalOwed)} {lang === 'am' ? 'ብር' : 'birr'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {suppliersWithBalance} {lang === 'am' ? 'አቅራቢ' : (suppliersWithBalance === 1 ? 'supplier' : 'suppliers')}
            </p>
          </div>
          <button
            onClick={onAddSupplier}
            className="px-3 py-2 text-sm font-black text-white min-h-[44px] press-scale"
            style={{ background: '#1B4332', borderRadius: 'var(--radius-sm)' }}
            type="button"
          >
            <span className="inline-flex items-center gap-1">
              <Plus className="w-4 h-4" /> {lang === 'am' ? 'አቅራቢ አክል' : 'Add supplier'}
            </span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === 'am' ? 'አቅራቢ ይፈልጉ' : 'Search supplier'}
          autoCapitalize="words"
          className="w-full pl-9 pr-4 py-3 text-sm bg-white border outline-none"
          style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredSuppliers.map((supplier) => {
          const hasBalance = Number(supplier.balance || 0) > 0;
          return (
            <button
              key={supplier.id}
              type="button"
              onClick={() => onSelectSupplier?.(supplier)}
              className="w-full text-left p-4 border press-scale"
              style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-gray-900 truncate">{supplier.display_name}</p>
                  {supplier.note && (
                    <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{supplier.note}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs" style={{ color: '#9ca3af' }}>
                    <span>{(supplier.transaction_count || 0)} {lang === 'am' ? 'መዝገብ' : 'entries'}</span>
                    {supplier.phone_number && <span>{supplier.phone_number}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
                    {lang === 'am' ? 'ለመክፈል' : 'I owe'}
                  </p>
                  <p className="text-lg font-black" style={{ color: hasBalance ? '#dc2626' : '#9ca3af' }}>
                    {fmt(supplier.balance || 0)} {lang === 'am' ? 'ብር' : 'birr'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        {filteredSuppliers.length === 0 && (
          <div
            className="flex flex-col items-center justify-center text-center py-10 border"
            style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }}
          >
            <Truck className="w-8 h-8 mb-2" style={{ color: '#d1d5db' }} />
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {suppliers.length === 0
                ? (lang === 'am' ? 'ምንም አቅራቢ የለም' : 'No suppliers yet')
                : (hasQuery ? (lang === 'am' ? 'ምንም አልተገኘም' : 'No matches') : (lang === 'am' ? 'ምንም አቅራቢ የለም' : 'No suppliers'))}
            </p>
            <p className="text-xs mt-2 max-w-xs" style={{ color: '#6b7280' }}>
              {lang === 'am'
                ? 'ከአቅራቢ የሚገዙትን ዱቤ እዚህ ይመዝግቡ።'
                : 'Track inventory you buy on credit from suppliers here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupplierList;

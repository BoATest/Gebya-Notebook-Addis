import { useState } from 'react';
import { X } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { fmt } from '../utils/numformat';

export default function ProfitCalculatorModal({ onClose }) {
  const { t } = useLang();
  const [cost, setCost] = useState('');
  const [sell, setSell] = useState('');

  const costNum = parseFloat(cost) || 0;
  const sellNum = parseFloat(sell) || 0;
  const profit = sellNum - costNum;
  const margin = sellNum > 0 ? ((profit / sellNum) * 100).toFixed(1) : null;

  const hasValues = costNum > 0 || sellNum > 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl pb-safe" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-amber-50">
          <h2 className="text-lg font-black text-gray-800">🧮 {t.calculator}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#f5f5f5' }}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">
              {t.calcCost} ({t.birr})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder={t.calcPlaceholder}
              autoFocus
              className="w-full px-4 py-3 border-2 rounded-xl text-base font-semibold focus:outline-none"
              style={{ borderColor: cost ? '#c47c1a' : '#e8d5b0' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">
              {t.calcSell} ({t.birr})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={sell}
              onChange={e => setSell(e.target.value)}
              placeholder={t.calcPlaceholder}
              className="w-full px-4 py-3 border-2 rounded-xl text-base font-semibold focus:outline-none"
              style={{ borderColor: sell ? '#c47c1a' : '#e8d5b0' }}
            />
          </div>

          {hasValues && (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                background: profit >= 0 ? '#f0fdf4' : '#fff1f2',
                border: `1.5px solid ${profit >= 0 ? '#bbf7d0' : '#fca5a5'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600">{t.calcProfit}</span>
                <span
                  className="text-2xl font-black"
                  style={{ color: profit >= 0 ? '#15803d' : '#dc2626' }}
                >
                  {profit >= 0 ? '+' : ''}{fmt(profit)} {t.birr}
                </span>
              </div>
              {margin !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-600">{t.calcMargin}</span>
                  <span
                    className="text-xl font-black"
                    style={{ color: profit >= 0 ? '#15803d' : '#dc2626' }}
                  >
                    {margin}%
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-bold text-sm min-h-[48px]"
            style={{ background: '#f5f5f5', color: '#374151' }}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

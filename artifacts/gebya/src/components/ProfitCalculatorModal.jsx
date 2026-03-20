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
      className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 animate-fade"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-md pb-safe animate-slide-up" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
          <h2 className="text-lg font-black text-gray-800 font-sans">🧮 {t.calculator}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center press-scale"
            style={{ background: '#f5f5f5', borderRadius: 'var(--radius-sm)' }}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 font-sans">
              {t.calcCost} ({t.birr})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder={t.calcPlaceholder}
              autoFocus
              className="w-full px-4 py-3 border-2 text-base font-semibold focus:outline-none font-sans"
              style={{ borderRadius: 'var(--radius-md)', borderColor: cost ? '#1B4332' : 'var(--color-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 font-sans">
              {t.calcSell} ({t.birr})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={sell}
              onChange={e => setSell(e.target.value)}
              placeholder={t.calcPlaceholder}
              className="w-full px-4 py-3 border-2 text-base font-semibold focus:outline-none font-sans"
              style={{ borderRadius: 'var(--radius-md)', borderColor: sell ? '#1B4332' : 'var(--color-border)' }}
            />
          </div>

          {hasValues && (
            <div
              className="p-4 space-y-3"
              style={{
                borderRadius: 'var(--radius-md)',
                background: profit >= 0 ? '#f0fdf4' : '#fff1f2',
                border: `1.5px solid ${profit >= 0 ? '#bbf7d0' : '#fca5a5'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600 font-sans">{t.calcProfit}</span>
                <span
                  className="text-2xl font-black font-sans"
                  style={{ color: profit >= 0 ? '#15803d' : '#dc2626' }}
                >
                  {profit >= 0 ? '+' : ''}{fmt(profit)} {t.birr}
                </span>
              </div>
              {margin !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-600 font-sans">{t.calcMargin}</span>
                  <span
                    className="text-xl font-black font-sans"
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
            className="w-full py-3 font-bold text-sm min-h-[48px] press-scale font-sans"
            style={{ background: '#f5f5f5', color: '#374151', borderRadius: 'var(--radius-md)' }}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

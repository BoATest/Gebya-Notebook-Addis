import React, { useState } from 'react';

export const AccountingBook: React.FC = () => {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <div className="w-[390px] bg-white flex flex-col font-sans text-gray-800 relative shadow-2xl overflow-hidden" style={{ fontFamily: "'Space Grotesk', sans-serif", height: '100%', minHeight: '844px' }}>
      {/* Header Band */}
      <div className="w-full flex justify-between items-center px-4 py-3 shrink-0" style={{ backgroundColor: '#6b1a1a', height: '80px' }}>
        <div className="flex flex-col">
          <span className="text-[26px] font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#c9a84c', lineHeight: 1.2 }}>ገበያ</span>
          <span className="text-[10px] tracking-[2px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#e8c57a' }}>GEBYA ACCOUNTING BOOK</span>
        </div>
        <div className="flex flex-col text-right text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#e8c57a' }}>
          <span>፯ ሰኔ ፳፻፲፯</span>
          <span>Mar 17, 2026</span>
        </div>
      </div>

      {/* Section Title Row */}
      <div className="w-full border-b-[2px] flex shrink-0" style={{ borderColor: '#6b1a1a' }}>
        <div className="flex-1 py-1.5 px-3 text-center text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#6b1a1a' }}>RECEIPTS (INCOME)</div>
        <div className="w-[1px] shrink-0" style={{ backgroundColor: '#6b1a1a' }}></div>
        <div className="flex-1 py-1.5 px-3 text-center text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#6b1a1a' }}>PAYMENTS (EXPENSES)</div>
      </div>

      {/* Main Content Area (Two-column layout) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center Spine Divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] transform -translate-x-1/2 z-10" style={{ backgroundColor: '#6b1a1a' }}></div>

        {/* LEFT COLUMN: Receipts / Income */}
        <div className="flex-1 overflow-y-auto pb-4 pt-2">
          {/* SALES Section */}
          <div className="mb-4">
            <div className="px-3 py-1 font-bold text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#1a3a1a' }}>SALES</div>
            
            <div className="px-3 py-2 flex justify-between items-end border-b" style={{ borderColor: '#e0d0d0' }}>
              <span className="text-[12px] text-gray-700">Injera (40 pcs)</span>
              <span className="text-[13px] text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>850</span>
            </div>
            <div className="px-3 py-2 flex justify-between items-end border-b" style={{ borderColor: '#e0d0d0' }}>
              <span className="text-[12px] text-gray-700">Sugar (5 kg)</span>
              <span className="text-[13px] text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>650</span>
            </div>
            <div className="px-3 py-2 flex justify-between items-end border-b" style={{ borderColor: '#e0d0d0' }}>
              <span className="text-[12px] text-gray-700">Cooking oil</span>
              <span className="text-[13px] text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>500</span>
            </div>
            <div className="px-3 py-2 flex justify-between items-end border-b" style={{ borderColor: '#e0d0d0' }}>
              <span className="text-[12px] text-gray-700">Berbere spice</span>
              <span className="text-[13px] text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>450</span>
            </div>
            
            <div className="px-3 pt-2 pb-1 flex justify-between items-end">
              <span className="text-[11px] font-bold text-gray-600" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>SUBTOTAL</span>
              <span className="text-[13px] font-bold text-black border-b border-black pb-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>2,450</span>
            </div>
          </div>

          {/* CREDITS Section */}
          <div className="mb-4">
            <div className="px-3 py-1 font-bold text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#1a1a3a' }}>CREDITS</div>
            
            <div className="px-3 py-2 flex justify-between items-end border-b" style={{ borderColor: '#e0d0d0' }}>
              <span className="text-[12px] text-gray-700">Abebe Bekele</span>
              <span className="text-[13px] text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>1,200</span>
            </div>
            
            <div className="px-3 pt-2 pb-1 flex justify-between items-end">
              <span className="text-[11px] font-bold text-gray-600" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>SUBTOTAL</span>
              <span className="text-[13px] font-bold text-black border-b border-black pb-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>1,200</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Payments / Expenses */}
        <div className="flex-1 overflow-y-auto pb-4 pt-2">
          {/* EXPENSES Section */}
          <div className="mb-4">
            <div className="px-3 py-1 font-bold text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#3a1a1a' }}>EXPENSES</div>
            
            <div className="px-3 py-2 flex justify-between items-end border-b" style={{ borderColor: '#e0d0d0' }}>
              <span className="text-[12px] text-gray-700">Market fee</span>
              <span className="text-[13px] text-red-600" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>180</span>
            </div>
            <div className="px-3 py-2 flex justify-between items-end border-b" style={{ borderColor: '#e0d0d0' }}>
              <span className="text-[12px] text-gray-700">Transport</span>
              <span className="text-[13px] text-red-600" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>500</span>
            </div>
            
            <div className="px-3 pt-2 pb-1 flex justify-between items-end">
              <span className="text-[11px] font-bold text-gray-600" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>SUBTOTAL</span>
              <span className="text-[13px] font-bold text-red-600 border-b border-red-600 pb-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>680</span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="w-full shrink-0 flex flex-col items-center py-4 px-4 bg-white" style={{ borderTop: '2px solid #6b1a1a', boxShadow: 'inset 0 4px 0 0 white, inset 0 5px 0 0 #6b1a1a' }}>
        <div className="text-[11px] text-[#6b1a1a] mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>BALANCE CARRIED FORWARD</div>
        <div className="text-[24px] font-bold relative" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#166534' }}>
          1,770 birr
          <div className="absolute left-0 right-0 -bottom-1 h-[3px]" style={{ borderBottom: '3px double #6b1a1a' }}></div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="w-full h-[56px] flex shrink-0 border-t-[2px]" style={{ borderColor: '#6b1a1a' }}>
        <button 
          onClick={() => setActiveTab('today')}
          className="flex-1 flex justify-center items-center gap-1 transition-colors"
          style={{ 
            backgroundColor: activeTab === 'today' ? '#6b1a1a' : 'white',
            color: activeTab === 'today' ? 'white' : '#6b1a1a'
          }}
        >
          <span className="text-[12px] font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: activeTab === 'today' ? '#c9a84c' : '#6b1a1a' }}>I.</span>
          <span className="text-[12px]">Today</span>
        </button>
        <button 
          onClick={() => setActiveTab('merro')}
          className="flex-1 flex justify-center items-center gap-1 transition-colors border-l"
          style={{ 
            backgroundColor: activeTab === 'merro' ? '#6b1a1a' : 'white',
            color: activeTab === 'merro' ? 'white' : '#6b1a1a',
            borderColor: activeTab === 'merro' ? '#6b1a1a' : '#e0d0d0'
          }}
        >
          <span className="text-[12px] font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: activeTab === 'merro' ? '#c9a84c' : '#6b1a1a' }}>II.</span>
          <span className="text-[12px]">Merro</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className="flex-1 flex justify-center items-center gap-1 transition-colors border-l"
          style={{ 
            backgroundColor: activeTab === 'history' ? '#6b1a1a' : 'white',
            color: activeTab === 'history' ? 'white' : '#6b1a1a',
            borderColor: activeTab === 'history' ? '#6b1a1a' : '#e0d0d0'
          }}
        >
          <span className="text-[12px] font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: activeTab === 'history' ? '#c9a84c' : '#6b1a1a' }}>III.</span>
          <span className="text-[12px]">History</span>
        </button>
      </div>
    </div>
  );
};

export default AccountingBook;

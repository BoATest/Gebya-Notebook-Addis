import React, { useState } from 'react';

export const FieldNotebook: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Today');

  const rings = Array.from({ length: 16 });

  return (
    <div className="flex justify-center items-center w-full h-full p-4" style={{ backgroundColor: '#e5e5e5' }}>
      {/* App container */}
      <div 
        style={{
          width: '390px',
          height: '100%',
          maxHeight: '844px',
          backgroundColor: '#fafaf7',
          backgroundImage: 'linear-gradient(to right, rgba(218, 232, 245, 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(218, 232, 245, 0.5) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Space Mono', monospace",
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRadius: '24px',
          border: '1px solid #d1d5db',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Spiral Binding */}
        <div 
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '22px',
            backgroundColor: '#ffffff',
            boxShadow: '3px 0 5px rgba(0,0,0,0.05)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-evenly',
            paddingTop: '20px',
            paddingBottom: '20px',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          {rings.map((_, i) => (
            <div 
              key={i}
              style={{
                width: '18px',
                height: '14px',
                border: '2px solid #888',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                marginLeft: '12px',
                boxShadow: '1px 1px 1px rgba(0,0,0,0.1)'
              }}
            />
          ))}
        </div>

        {/* Content Area */}
        <div 
          style={{
            marginLeft: '22px', // Space for binding
            flex: 1,
            overflowY: 'auto',
            padding: '20px 16px 20px 20px',
            position: 'relative',
            fontFamily: "'Caveat', cursive",
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 style={{ fontSize: '32px', color: '#1a1a1a', margin: 0, lineHeight: 1.1, fontWeight: 'bold' }}>
                ገበያ 📒
              </h1>
              <p style={{ fontSize: '18px', color: '#555', margin: 0, lineHeight: 1.2 }}>
                Gebya Field Notebook
              </p>
            </div>
            <div className="text-right mt-1">
              <div style={{ fontSize: '18px', color: '#333', lineHeight: 1.2 }}>Mon Mar 17</div>
              <div style={{ fontSize: '16px', color: '#666', lineHeight: 1.2 }}>፯ ሰኔ</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-300 mb-6 relative z-10" style={{ marginLeft: '-4px' }}>
            {['Today', 'Merro', 'History'].map(tab => {
              const isActive = activeTab === tab;
              return (
                <div 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: isActive ? '#ffffff' : '#f0ede8',
                    borderTop: '1px solid #ccc',
                    borderRight: '1px solid #ccc',
                    borderLeft: '3px dashed #ccc',
                    borderBottom: isActive ? 'none' : '1px solid #ccc',
                    marginBottom: isActive ? '-1px' : '0',
                    cursor: 'pointer',
                    fontSize: isActive ? '22px' : '18px',
                    color: isActive ? '#000' : '#666',
                    position: 'relative',
                    borderTopLeftRadius: '4px',
                    ...(isActive && tab === 'Today' ? {
                      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                      borderTopRightRadius: 0
                    } : {
                      borderTopRightRadius: '4px'
                    }),
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '4px',
                      height: '4px',
                      backgroundColor: '#1a1a1a',
                      borderRadius: '50%'
                    }} />
                  )}
                  {isActive && tab === 'Today' && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '10px',
                      height: '10px',
                      backgroundColor: '#e5e5e5',
                      borderBottomLeftRadius: '4px',
                      boxShadow: '-1px 1px 2px rgba(0,0,0,0.1)'
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Note Profit Card */}
          <div 
            style={{
              backgroundColor: '#fef08a',
              padding: '16px',
              borderRadius: '2px',
              transform: 'rotate(-1.5deg)',
              boxShadow: '2px 4px 10px rgba(0,0,0,0.1)',
              position: 'relative',
              marginBottom: '28px',
              marginLeft: '4px',
              marginRight: '8px',
              border: '1px solid rgba(0,0,0,0.05)'
            }}
          >
            {/* Pushpin */}
            <div 
              style={{
                position: 'absolute',
                top: '6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '12px',
                height: '12px',
                backgroundColor: '#9ca3af',
                borderRadius: '50%',
                boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.3), 1px 2px 3px rgba(0,0,0,0.4)',
                zIndex: 10
              }}
            />
            
            <div style={{ fontSize: '15px', color: '#1a1a1a', marginTop: '4px' }}>
              Today's take:
            </div>
            <div style={{ 
              fontFamily: "'Space Mono', monospace", 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#166534',
              margin: '2px 0 12px 0',
              borderBottom: '2px solid rgba(22, 101, 52, 0.3)',
              display: 'inline-block'
            }}>
              1,770 birr
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex justify-between items-end pb-1" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '18px', color: '#166534' }}>Sales:</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '15px', color: '#166534' }}>2,450</span>
              </div>
              <div className="flex justify-between items-end pb-1" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '18px', color: '#dc2626' }}>Spent:</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '15px', color: '#dc2626' }}>-680</span>
              </div>
              <div className="flex justify-between items-end pb-1" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '18px', color: '#2563eb' }}>Credit:</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '15px', color: '#2563eb' }}>1,200</span>
              </div>
            </div>
          </div>

          {/* Quick Entry Buttons */}
          <div className="flex justify-between mb-8 gap-3 pr-2">
            {[
              { label: '💰 Sold', color: '#059669', borderColor: '#059669' },
              { label: '🛒 Spent', color: '#dc2626', borderColor: '#dc2626' },
              { label: '👥 Credit', color: '#2563eb', borderColor: '#2563eb' }
            ].map((btn, i) => (
              <button 
                key={i}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  backgroundColor: 'transparent',
                  border: `2px dashed ${btn.borderColor}`,
                  borderRadius: '6px',
                  color: btn.color,
                  fontSize: '20px',
                  fontFamily: "'Caveat', cursive",
                  cursor: 'pointer',
                  transform: `rotate(${i === 1 ? '1.5deg' : i === 2 ? '-1deg' : '-0.5deg'})`,
                  transition: 'transform 0.1s ease',
                  fontWeight: 'bold',
                  boxShadow: '1px 1px 3px rgba(0,0,0,0.05)'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = `scale(1) rotate(${i === 1 ? '1.5deg' : i === 2 ? '-1deg' : '-0.5deg'})`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Transactions */}
          <div className="pr-2">
            <div style={{ textAlign: 'center', fontSize: '18px', color: '#888', fontStyle: 'italic', marginBottom: '16px' }}>
              — today's jottings —
            </div>
            
            <div className="flex flex-col gap-4">
              {[
                { name: 'Injera (40 pcs)', amount: 850, color: '#166534' },
                { name: 'Sugar (5 kg)', amount: 650, color: '#166534' },
                { name: 'Market fee', amount: -180, color: '#dc2626' },
                { name: 'Cooking oil', amount: 500, color: '#166534' },
                { name: 'Berbere spice', amount: 450, color: '#166534' },
                { name: 'Transport', amount: -500, color: '#dc2626' },
                { name: 'Abebe Bekele owes me', amount: 1200, color: '#2563eb' }
              ].map((tx, i) => (
                <div 
                  key={i} 
                  className="flex justify-between items-end pb-1"
                  style={{
                    borderBottom: '1px solid transparent', // for spacing
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: '22px', color: '#1a1a1a', lineHeight: 1 }}>{tx.name}</span>
                  <span style={{ 
                    fontFamily: "'Space Mono', monospace", 
                    fontSize: '15px', 
                    color: tx.color,
                    fontWeight: 'bold'
                  }}>
                    {tx.amount > 0 ? tx.amount.toLocaleString() : tx.amount.toLocaleString()}
                  </span>
                  {/* Wavy/hand-drawn underline effect */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundImage: 'linear-gradient(178deg, transparent 40%, #c4b5a0 45%, transparent 50%)',
                    backgroundSize: '100% 2px',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.8
                  }} />
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default FieldNotebook;

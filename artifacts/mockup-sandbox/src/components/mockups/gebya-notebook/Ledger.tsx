import React, { useState } from "react";

export const Ledger = () => {
  const [activeTab, setActiveTab] = useState<'Today' | 'Merro' | 'History'>('Today');

  return (
    <div className="ledger-container">
      <style>{`
        .ledger-container {
          position: relative;
          width: 390px;
          height: 100%;
          min-height: 844px; /* typical mobile height */
          background-color: #f5f0e8;
          /* Noise texture and repeating ruled lines */
          background-image: 
            url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E"),
            repeating-linear-gradient(transparent, transparent 31px, #d4c5a9 31px, #d4c5a9 32px);
          overflow-y: auto;
          overflow-x: hidden;
          font-family: 'Libre Baskerville', serif;
          color: #2b2520;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        .ledger-content {
          padding: 24px 32px 40px 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Typography */
        .font-heading {
          font-family: 'Playfair Display', serif;
        }
        .font-mono {
          font-family: 'Space Mono', monospace;
        }
        .font-body {
          font-family: 'Libre Baskerville', serif;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .brand-title {
          font-size: 28px;
          color: #2c5f2e;
          letter-spacing: 1px;
          margin: 0;
          line-height: 1.1;
        }
        .subtitle {
          font-size: 13px;
          font-style: italic;
          color: #5c3317;
          margin: 4px 0 0 0;
        }
        .date-box {
          text-align: right;
          font-size: 11px;
          color: #5c3317;
          line-height: 1.4;
        }

        /* Profit Card */
        .profit-card {
          border: 2px solid #5c3317;
          padding: 16px;
          text-align: center;
          background: rgba(245, 240, 232, 0.7);
          box-shadow: inset 0 0 10px rgba(92, 51, 23, 0.1);
          position: relative;
        }
        .profit-card::before, .profit-card::after {
          content: '';
          position: absolute;
          width: 6px;
          height: 6px;
          border: 1px solid #5c3317;
          border-radius: 50%;
        }
        .profit-card::before { top: 4px; left: 4px; }
        .profit-card::after { top: 4px; right: 4px; }
        
        .profit-label {
          font-size: 12px;
          color: #5c3317;
          letter-spacing: 1px;
          margin: 0 0 8px 0;
          text-transform: uppercase;
        }
        .profit-amount {
          font-size: 32px;
          font-weight: 700;
          color: #8b1a1a;
          margin: 0 0 4px 0;
          letter-spacing: -0.5px;
        }
        .profit-sub {
          font-size: 11px;
          color: #5c3317;
          margin: 0;
        }

        /* Metrics Row */
        .metrics-row {
          display: flex;
          border: 1px solid #5c3317;
          background: rgba(245, 240, 232, 0.7);
        }
        .metric-cell {
          flex: 1;
          padding: 10px 4px;
          text-align: center;
          border-right: 1px solid #5c3317;
        }
        .metric-cell:last-child {
          border-right: none;
        }
        .metric-label {
          font-size: 10px;
          letter-spacing: 1px;
          margin-bottom: 4px;
          color: #5c3317;
          text-transform: uppercase;
        }
        .metric-value {
          font-size: 13px;
          font-weight: 700;
        }
        .color-green { color: #2c4a1e; }
        .color-red { color: #8b2a2a; }
        .color-navy { color: #1a2c5c; }

        /* Action Buttons */
        .actions-row {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .action-btn {
          padding: 12px;
          border: 1px solid rgba(0,0,0,0.2);
          border-radius: 4px;
          color: #f5f0e8;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          text-align: center;
          cursor: pointer;
          box-shadow: 2px 2px 0px rgba(0,0,0,0.1);
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .action-btn:active {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px rgba(0,0,0,0.1);
        }
        .btn-sold { background-color: #2c5f2e; }
        .btn-spent { background-color: #8b2a2a; }
        .btn-credit { background-color: #1a2c5c; }

        /* Ledger Table */
        .ledger-section {
          margin-top: 8px;
        }
        .section-header {
          font-size: 14px;
          font-weight: 700;
          color: #5c3317;
          margin: 0 0 12px 0;
          padding-bottom: 4px;
          border-bottom: 3px double #d4c5a9;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .ledger-table {
          width: 100%;
          border-collapse: collapse;
        }
        .ledger-table th {
          font-size: 10px;
          color: #8b7d6b;
          text-align: left;
          padding: 0 4px 8px 4px;
          font-weight: normal;
          border-bottom: 1px solid #d4c5a9;
          text-transform: uppercase;
        }
        .ledger-table td {
          padding: 12px 4px;
          font-size: 13px;
          border-bottom: 1px solid #d4c5a9;
        }
        .col-item { width: 40%; }
        .col-qty { width: 15%; text-align: center; }
        .col-type { width: 20%; font-size: 10px !important; color: #8b7d6b; }
        .col-amt { width: 25%; text-align: right; font-weight: 700; }

        /* Side Navigation Tabs */
        .nav-tabs {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .nav-tab {
          width: 28px;
          height: 80px;
          border: 1px solid #d4c5a9;
          border-right: none;
          border-radius: 6px 0 0 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: -2px 2px 4px rgba(0,0,0,0.05);
          cursor: pointer;
        }
        .nav-tab-text {
          transform: rotate(90deg);
          font-size: 12px;
          white-space: nowrap;
          color: #5c3317;
        }
        .tab-active {
          background-color: #f5f0e8;
          width: 30px;
          box-shadow: -3px 3px 6px rgba(0,0,0,0.08);
          z-index: 10;
        }
        .tab-active .nav-tab-text {
          font-weight: 700;
          color: #2c5f2e;
        }
        .tab-inactive {
          background-color: #e8e0d0;
        }
      `}</style>

      <div className="ledger-content">
        {/* Header */}
        <header className="header">
          <div>
            <h1 className="brand-title font-heading">ገበያ</h1>
            <p className="subtitle font-body">Gebya — Business Notebook</p>
          </div>
          <div className="date-box font-mono">
            <div>፯ ሰኔ ፳፻፲፯</div>
            <div>Mon, Mar 17</div>
          </div>
        </header>

        {/* Profit Summary */}
        <div className="profit-card">
          <p className="profit-label font-mono">Today's Record</p>
          <p className="profit-amount font-heading">1,770 birr</p>
          <p className="profit-sub font-mono">Net from today's trade</p>
        </div>

        {/* Metrics Row */}
        <div className="metrics-row font-mono">
          <div className="metric-cell">
            <div className="metric-label">Sales</div>
            <div className="metric-value color-green">2,450 birr</div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">Expenses</div>
            <div className="metric-value color-red">680 birr</div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">Credit</div>
            <div className="metric-value color-navy">1,200 birr</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="actions-row font-mono">
          <button className="action-btn btn-sold">
            <span>✦</span> SOLD
          </button>
          <button className="action-btn btn-spent">
            <span>✦</span> SPENT
          </button>
          <button className="action-btn btn-credit">
            <span>✦</span> CREDIT
          </button>
        </div>

        {/* Ledger Table */}
        <div className="ledger-section">
          <h2 className="section-header font-mono">Today's Entries</h2>
          <table className="ledger-table">
            <thead>
              <tr className="font-mono">
                <th className="col-item">Item</th>
                <th className="col-qty">Qty</th>
                <th className="col-type">Type</th>
                <th className="col-amt">Amount</th>
              </tr>
            </thead>
            <tbody className="font-body">
              <tr>
                <td className="col-item">Injera (40 pcs)</td>
                <td className="col-qty font-mono">40</td>
                <td className="col-type font-mono">SALE</td>
                <td className="col-amt font-mono color-green">850 birr</td>
              </tr>
              <tr>
                <td className="col-item">Sugar (5 kg)</td>
                <td className="col-qty font-mono">5</td>
                <td className="col-type font-mono">SALE</td>
                <td className="col-amt font-mono color-green">650 birr</td>
              </tr>
              <tr>
                <td className="col-item">Market fee</td>
                <td className="col-qty font-mono">—</td>
                <td className="col-type font-mono">EXPENSE</td>
                <td className="col-amt font-mono color-red">-180 birr</td>
              </tr>
              <tr>
                <td className="col-item">Cooking oil</td>
                <td className="col-qty font-mono">2</td>
                <td className="col-type font-mono">SALE</td>
                <td className="col-amt font-mono color-green">500 birr</td>
              </tr>
              <tr>
                <td className="col-item">Berbere spice</td>
                <td className="col-qty font-mono">1</td>
                <td className="col-type font-mono">SALE</td>
                <td className="col-amt font-mono color-green">450 birr</td>
              </tr>
              <tr>
                <td className="col-item">Transport</td>
                <td className="col-qty font-mono">—</td>
                <td className="col-type font-mono">EXPENSE</td>
                <td className="col-amt font-mono color-red">-500 birr</td>
              </tr>
              <tr>
                <td className="col-item">Abebe (credit)</td>
                <td className="col-qty font-mono">—</td>
                <td className="col-type font-mono">CREDIT</td>
                <td className="col-amt font-mono color-navy">1,200 birr</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs font-body">
        {(['Today', 'Merro', 'History'] as const).map((tab) => (
          <div
            key={tab}
            className={`nav-tab ${activeTab === tab ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="nav-tab-text">{tab}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ledger;

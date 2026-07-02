<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Credit Action Row Wireframe</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Sans+Ethiopic:wght@400;600;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #F5F5F7;
      --surface: #FFFFFF;
      --text: #1a1a1a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Inter', 'Noto Sans Ethiopic', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      padding: 24px 16px 120px;
    }
    .phone {
      width: 100%;
      max-width: 390px;
    }
    .screen-title {
      font-size: 22px;
      font-weight: 900;
      margin: 0 0 4px;
    }
    .screen-subtitle {
      font-size: 12px;
      color: #6b7280;
      font-weight: 600;
      margin: 0 0 18px;
    }
    .card {
      background: var(--surface);
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .col-left { flex: 1; min-width: 0; }
    .col-right { flex-shrink: 0; }

    /* Primary button */
    .btn-primary {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 52px;
      border: none;
      border-radius: 14px;
      background: #1A66FF;
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(26,102,255,0.25);
    }
    .btn-primary .icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(255,255,255,0.18);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
    }

    /* Two-button row */
    .action-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .btn-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 50px;
      border: none;
      border-radius: 14px;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      text-align: center;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.08);
    }
    .btn-gave {
      background: #E75645;
    }
    .btn-got {
      background: #2EAB6F;
    }
    .btn-pill .label {
      line-height: 1.2;
    }
    .btn-pill .sublabel {
      font-size: 11px;
      opacity: 0.85;
      font-weight: 700;
    }

    /* Toggle */
    .toggle {
      display: inline-flex;
      background: #f3f4f6;
      border-radius: 999px;
      padding: 4px;
      margin-bottom: 12px;
      border: 1px solid #e5e7eb;
    }
    .toggle button {
      border: none;
      background: transparent;
      padding: 8px 12px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
      color: #6b7280;
    }
    .toggle button.active {
      background: #ffffff;
      color: #111827;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .note {
      margin-top: 14px;
      font-size: 12px;
      color: #6b7280;
      font-weight: 600;
    }
    .note code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="phone">
    <div class="screen-title">Credit</div>
    <div class="screen-subtitle">Record a new customer or add a credit/payment</div>

    <div class="toggle">
      <button id="modeList" class="active" onclick="setMode('list')">List view</button>
      <button id="modeDetail" onclick="setMode('detail')">Detail view</button>
    </div>

    <div id="listArea">
      <div class="card">
        <div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#374151;">Add Customer</div>
        <p style="margin:0 0 12px;font-size:12px;color:#6b7280;font-weight:600;">Opens the add-customer form.</p>
        <button class="btn-primary" type="button">
          <span class="icon">+</span>
          <span>Add Customer</span>
        </button>
      </div>

      <div class="card">
        <div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#374151;">Credit / Payment row</div>
        <p style="margin:0 0 12px;font-size:12px;color:#6b7280;font-weight:600;">Only shown after selecting a customer.</p>
        <div style="opacity:0.45;pointer-events:none;">
          <div class="action-row">
            <button class="btn-pill btn-gave" type="button">
              <span class="label">YOU GAVE (Dubie)</span>
              <span class="sublabel">እቃ በዱቤ ሰጠሁ (-)</span>
            </button>
            <button class="btn-pill btn-got" type="button">
              <span class="label">YOU GOT (Paid)</span>
              <span class="sublabel">ክፍያ ተቀበልኩ (+)</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div id="detailArea" style="display:none;">
      <div class="card">
        <div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#374151;">Selected customer</div>
        <p style="margin:0 0 12px;font-size:12px;color:#6b7280;font-weight:600;">Credit/Payment row appears below.</p>
        <div class="action-row">
          <button class="btn-pill btn-gave" type="button">
            <span class="label">YOU GAVE (Dubie)</span>
            <span class="sublabel">እቃ በዱቤ ሰጠሁ (-)</span>
          </button>
          <button class="btn-pill btn-got" type="button">
            <span class="label">YOU GOT (Paid)</span>
            <span class="sublabel">ክፍያ ተቀበልኩ (+)</span>
          </button>
        </div>
      </div>
    </div>

    <div class="note">
      Wireframe preview only. Exact padding, shadow, and disabled-state opacity will follow the existing app conventions.
    </div>
  </div>

  <script>
    function setMode(mode) {
      document.getElementById('modeList').classList.toggle('active', mode === 'list');
      document.getElementById('modeDetail').classList.toggle('active', mode === 'detail');
      document.getElementById('listArea').style.display = mode === 'list' ? '' : 'none';
      document.getElementById('detailArea').style.display = mode === 'detail' ? '' : 'none';
    }
  </script>
</body>
</html>

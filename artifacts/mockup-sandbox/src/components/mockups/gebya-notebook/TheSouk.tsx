import { useState } from "react";

type Tab = "today" | "merro" | "history";

const D = {
  date: "8 ጥቅምት 2017",
  sales: 2450,
  expenses: 680,
  net: 1770,
  entries: [
    { type: "sale", label: "Injera (40 pcs)", amount: 850, profit: 320 },
    { type: "sale", label: "Sugar (5 kg)", amount: 650, profit: 200 },
    { type: "sale", label: "Cooking Oil", amount: 500, profit: 150 },
    { type: "expense", label: "Market Fee", amount: 180 },
    { type: "expense", label: "Transport", amount: 500 },
    { type: "credit", label: "Abebe Bekele", amount: 1200, due: "3 days" },
  ],
  merro: [
    { name: "Abebe Bekele", remaining: 1200, total: 1200, urgency: "yellow", due: "3 days" },
    { name: "Tigist M.", remaining: 450, total: 900, urgency: "red", due: "Overdue" },
    { name: "Dawit G.", remaining: 600, total: 600, urgency: "green", due: "12 days" },
  ],
  history: [
    { day: "ዛሬ — 8 ጥቅምት", sales: 2450, exp: 680, net: 1770 },
    { day: "7 ጥቅምት", sales: 3100, exp: 420, net: 2680 },
    { day: "6 ጥቅምት", sales: 1850, exp: 950, net: 900 },
    { day: "5 ጥቅምት", sales: 2200, exp: 310, net: 1890 },
  ],
};

const fmt = (n: number) => n.toLocaleString();

// Design 4 — "Birr Card": sand/terra cotta, large card with one number, minimalist
export function TheSouk() {
  const [tab, setTab] = useState<Tab>("today");
  const [hidden, setHidden] = useState(false);
  const mask = (n: number) => (hidden ? "••••" : fmt(n));

  const urgencyColor: Record<string, string> = {
    red: "#dc2626", yellow: "#ca8a04", green: "#15803d",
  };
  const urgencyBg: Record<string, string> = {
    red: "#fef2f2", yellow: "#fefce8", green: "#f0fdf4",
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#f5ede0", fontFamily: "'Inter', sans-serif" }}>

      {/* Status bar area + header */}
      <div className="flex-shrink-0 pt-10 px-5 pb-5" style={{ background: "#7c3d12" }}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="text-white font-black text-2xl tracking-tight">ገበያ</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{D.date}</div>
          </div>
          <button onClick={() => setHidden(h => !h)} className="mt-1 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)" }}>
            {hidden ? "Show" : "Hide"}
          </button>
        </div>

        {/* Single big profit number */}
        <div className="mb-2">
          <div className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Net Profit Today</div>
          <div className="text-5xl font-black text-white leading-none">{mask(D.net)}</div>
          <div className="text-base font-semibold mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>birr</div>
        </div>

        {/* Thin divider + sub-stats */}
        <div className="flex gap-6 mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
          <div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Sales</div>
            <div className="font-bold text-white">{mask(D.sales)} birr</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Spent</div>
            <div className="font-bold text-white">{mask(D.expenses)} birr</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 flex gap-2 flex-shrink-0" style={{ background: "#9a4c18" }}>
        {[
          { label: "ሸጠሁ", sub: "Sold", color: "#bbf7d0", textColor: "#14532d" },
          { label: "ወጪ", sub: "Spent", color: "#fecaca", textColor: "#7f1d1d" },
          { label: "ሜሮ", sub: "Credit", color: "#fde68a", textColor: "#78350f" },
        ].map(b => (
          <button key={b.label} className="flex-1 py-2.5 rounded-xl text-center" style={{ background: b.color }}>
            <div className="font-black text-sm" style={{ color: b.textColor }}>{b.label}</div>
            <div className="text-xs font-medium" style={{ color: b.textColor, opacity: 0.7 }}>{b.sub}</div>
          </button>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="px-4 pt-3 flex gap-1 flex-shrink-0">
        {([ ["today", "ዛሬ", "Today"], ["merro", "ሜሮ", "Credit"], ["history", "ታሪክ", "History"] ] as const).map(([key, am, en]) => (
          <button key={key} onClick={() => setTab(key)} className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: tab === key ? "#7c3d12" : "transparent",
              color: tab === key ? "#fff" : "#92400e",
            }}>
            {am} <span className="font-normal text-xs opacity-70">{en}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {tab === "today" && D.entries.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: e.type === "sale" ? "#dcfce7" : e.type === "expense" ? "#fee2e2" : "#fef9c3" }}>
              {e.type === "sale" ? "📦" : e.type === "expense" ? "💸" : "📋"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800 truncate">{e.label}</div>
              {e.type === "credit" && <div className="text-xs text-amber-600">Due in {(e as any).due}</div>}
              {e.type === "sale" && (e as any).profit && <div className="text-xs text-green-600">+{hidden ? "••" : fmt((e as any).profit)} profit</div>}
            </div>
            <div className="text-right">
              <div className="font-bold text-sm" style={{ color: e.type === "sale" ? "#15803d" : e.type === "expense" ? "#dc2626" : "#92400e" }}>
                {hidden ? "••••" : `${e.type === "expense" ? "-" : "+"}${fmt(e.amount)}`}
              </div>
              <div className="text-xs text-gray-400">birr</div>
            </div>
          </div>
        ))}

        {tab === "merro" && D.merro.map((m, i) => (
          <div key={i} className="rounded-2xl px-4 py-4" style={{ background: urgencyBg[m.urgency], border: `1px solid ${urgencyColor[m.urgency]}22` }}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-gray-800">{m.name}</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: urgencyColor[m.urgency] }}>{m.due}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-xl" style={{ color: urgencyColor[m.urgency] }}>
                  {hidden ? "••••" : fmt(m.remaining)}
                </div>
                <div className="text-xs text-gray-400">birr</div>
              </div>
            </div>
          </div>
        ))}

        {tab === "history" && (
          <>
            {D.history.map((h, i) => (
              <div key={i} className="rounded-2xl px-4 py-3" style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-semibold text-sm text-gray-700">{h.day}</span>
                  <span className="font-black" style={{ color: "#15803d" }}>{hidden ? "••••" : `+${fmt(h.net)}`} birr</span>
                </div>
                <div className="text-xs text-gray-400">Sales {hidden ? "••" : fmt(h.sales)} · Spent {hidden ? "••" : fmt(h.exp)}</div>
              </div>
            ))}
            <button className="w-full mt-2 py-3 rounded-2xl text-sm font-black" style={{ background: "#7c3d12", color: "#fff" }}>
              📤 Export CSV
            </button>
          </>
        )}
      </div>
    </div>
  );
}

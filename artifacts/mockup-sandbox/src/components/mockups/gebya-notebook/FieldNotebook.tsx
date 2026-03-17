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

// Design 2 — "Tej House": warm amber/sand palette, rounded pill nav, large numbers
export function FieldNotebook() {
  const [tab, setTab] = useState<Tab>("today");
  const [hidden, setHidden] = useState(false);
  const mask = (n: number) => (hidden ? "••••" : fmt(n));

  const urgencyColor: Record<string, string> = {
    red: "#ef4444", yellow: "#f59e0b", green: "#22c55e",
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#f9f4ec", fontFamily: "'Inter', sans-serif" }}>

      {/* Header bar */}
      <div className="px-5 pt-10 pb-5 flex-shrink-0" style={{ background: "#c47c1a" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="font-black text-3xl text-white tracking-tight">ገበያ</span>
            <span className="ml-2 text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{D.date}</span>
          </div>
          <button onClick={() => setHidden(h => !h)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "rgba(0,0,0,0.15)", color: "#fff" }}>
            {hidden ? "Show" : "Hide"}
          </button>
        </div>

        {/* Big profit highlight */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.12)" }}>
          <div className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>Today's Profit</div>
          <div className="text-4xl font-black text-white">{mask(D.net)} <span className="text-xl font-semibold opacity-70">ብር</span></div>
          <div className="flex gap-4 mt-2 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
            <span>↑ {mask(D.sales)} sold</span>
            <span>↓ {mask(D.expenses)} spent</span>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="px-4 py-3 flex gap-2 flex-shrink-0" style={{ background: "#e8901e" }}>
        {[
          { label: "Sold", amharic: "ሸጠሁ", color: "#fff", bg: "rgba(255,255,255,0.2)" },
          { label: "Spent", amharic: "ወጪ", color: "#fff", bg: "rgba(0,0,0,0.15)" },
          { label: "Credit", amharic: "ሜሮ", color: "#fff", bg: "rgba(0,0,0,0.15)" },
        ].map(b => (
          <button key={b.label} className="flex-1 py-3 rounded-xl text-center" style={{ background: b.bg }}>
            <div className="text-white font-bold text-sm">{b.amharic}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>{b.label}</div>
          </button>
        ))}
      </div>

      {/* Tab selector */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex gap-1 p-1 rounded-full" style={{ background: "#efe8da" }}>
          {([ ["today", "ዛሬ"], ["merro", "ሜሮ"], ["history", "ታሪክ"] ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className="flex-1 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{ background: tab === key ? "#c47c1a" : "transparent", color: tab === key ? "#fff" : "#8b6a3a" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {tab === "today" && D.entries.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "#fff", border: "1px solid #ede0cc" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: e.type === "sale" ? "#fef9f0" : e.type === "expense" ? "#fff5f5" : "#fff8e6" }}>
              {e.type === "sale" ? "📦" : e.type === "expense" ? "💸" : "📋"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm truncate">{e.label}</div>
              {e.type === "credit" && <div className="text-xs text-amber-500">Due in {(e as any).due}</div>}
              {e.type === "sale" && (e as any).profit && <div className="text-xs text-green-600">Profit: {hidden ? "••" : fmt((e as any).profit)}</div>}
            </div>
            <div className="text-right">
              <div className="font-bold text-sm" style={{ color: e.type === "sale" ? "#16a34a" : e.type === "expense" ? "#ef4444" : "#c47c1a" }}>
                {hidden ? "••••" : `${e.type === "expense" ? "-" : "+"}${fmt(e.amount)}`}
              </div>
              <div className="text-xs text-gray-400">birr</div>
            </div>
          </div>
        ))}

        {tab === "merro" && (
          <>
            <div className="rounded-2xl p-4 mb-1" style={{ background: "#fff8e6", border: "1px solid #f0d080" }}>
              <div className="text-xs font-semibold text-amber-700 mb-1">Total Owed to You</div>
              <div className="font-black text-2xl text-amber-800">{hidden ? "••••" : fmt(D.merro.reduce((a,m) => a+m.remaining, 0))} ብር</div>
            </div>
            {D.merro.map((m, i) => (
              <div key={i} className="rounded-2xl px-4 py-3" style={{ background: "#fff", border: "1px solid #ede0cc" }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-800">{m.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: urgencyColor[m.urgency] }} />
                      <span className="text-xs text-gray-500">{m.due}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg text-gray-800">{hidden ? "••••" : fmt(m.remaining)}</div>
                    <div className="text-xs text-gray-400">birr remaining</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "history" && (
          <>
            {D.history.map((h, i) => (
              <div key={i} className="rounded-2xl px-4 py-3" style={{ background: "#fff", border: `1px solid ${i === 0 ? "#f0c060" : "#ede0cc"}` }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-700 text-sm">{h.day}</span>
                  <span className="font-black" style={{ color: "#16a34a" }}>{hidden ? "••••" : `+${fmt(h.net)}`} birr</span>
                </div>
                <div className="text-xs text-gray-400">Sales {hidden ? "••" : fmt(h.sales)} · Spent {hidden ? "••" : fmt(h.exp)}</div>
              </div>
            ))}
            <button className="w-full mt-2 py-3 rounded-2xl text-sm font-bold" style={{ background: "#c47c1a", color: "#fff" }}>
              📤 Export CSV
            </button>
          </>
        )}
      </div>
    </div>
  );
}

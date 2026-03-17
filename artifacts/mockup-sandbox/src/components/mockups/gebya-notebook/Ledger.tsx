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

// Design 1 — "Habesha Gold": dark header, ivory body, warm gold accents
export function Ledger() {
  const [tab, setTab] = useState<Tab>("today");
  const [hidden, setHidden] = useState(false);
  const mask = (n: number) => (hidden ? "••••" : fmt(n));

  const urgencyDot: Record<string, string> = {
    red: "#dc2626", yellow: "#d97706", green: "#16a34a",
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#fdf8f0", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex-shrink-0" style={{ background: "#2c1a0e" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-black text-2xl" style={{ color: "#e8c87a" }}>ገበያ</div>
            <div className="text-xs mt-0.5" style={{ color: "#a08060" }}>{D.date}</div>
          </div>
          <button
            onClick={() => setHidden(h => !h)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(232,200,122,0.15)", color: "#e8c87a", border: "1px solid rgba(232,200,122,0.3)" }}
          >
            {hidden ? "👁 Show" : "🙈 Hide"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Sales", value: mask(D.sales), color: "#e8c87a" },
            { label: "Spent", value: mask(D.expenses), color: "#f87171" },
            { label: "Profit", value: mask(D.net), color: "#4ade80" },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="text-xs mb-1" style={{ color: "#a08060" }}>{s.label}</div>
              <div className="font-black text-sm" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 py-3 flex gap-2 flex-shrink-0" style={{ background: "#3a2213" }}>
        {[
          { label: "+ ሸጠሁ", sub: "I Sold", color: "#16a34a" },
          { label: "+ ወጪ", sub: "Spent", color: "#dc2626" },
          { label: "+ ሜሮ", sub: "Credit", color: "#c08020" },
        ].map(b => (
          <button key={b.label} className="flex-1 py-2.5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${b.color}44` }}>
            <div className="font-bold text-sm" style={{ color: b.color }}>{b.label}</div>
            <div className="text-xs text-gray-400">{b.sub}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {tab === "today" && D.entries.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "#fff", border: "1px solid #f0e6d4" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: e.type === "sale" ? "#f0fdf4" : e.type === "expense" ? "#fef2f2" : "#fffbeb" }}>
              {e.type === "sale" ? "📦" : e.type === "expense" ? "💸" : "📋"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800 truncate">{e.label}</div>
              {e.type === "credit" && <div className="text-xs text-amber-600">Due in {(e as any).due}</div>}
              {e.type === "sale" && (e as any).profit && <div className="text-xs text-green-600">+{hidden ? "••" : fmt((e as any).profit)} profit</div>}
            </div>
            <div className="font-bold text-sm text-right">
              <span style={{ color: e.type === "sale" ? "#16a34a" : e.type === "expense" ? "#dc2626" : "#c08020" }}>
                {hidden ? "••••" : `${e.type === "expense" ? "-" : "+"}${fmt(e.amount)}`}
              </span>
              <div className="text-xs font-normal text-gray-400">birr</div>
            </div>
          </div>
        ))}

        {tab === "merro" && D.merro.map((m, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #f0e6d4" }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-bold text-gray-800">{m.name}</div>
                <div className="text-xs text-gray-400">{m.due}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-lg text-gray-800">{hidden ? "••••" : fmt(m.remaining)}<span className="text-xs font-normal text-gray-400 ml-1">birr</span></div>
                <div className="flex items-center gap-1 justify-end">
                  <div className="w-2 h-2 rounded-full" style={{ background: urgencyDot[m.urgency] }} />
                  <span className="text-xs text-gray-400">{m.urgency === "red" ? "Urgent" : m.urgency === "yellow" ? "Soon" : "OK"}</span>
                </div>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.round(((m.total - m.remaining) / m.total) * 100)}%`, background: urgencyDot[m.urgency] }} />
            </div>
          </div>
        ))}

        {tab === "history" && (
          <>
            {D.history.map((h, i) => (
              <div key={i} className="rounded-2xl px-4 py-3" style={{ background: i === 0 ? "#fffbeb" : "#fff", border: `1px solid ${i === 0 ? "#f59e0b55" : "#f0e6d4"}` }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm text-gray-700">{h.day}</span>
                  <span className="font-black text-base" style={{ color: "#16a34a" }}>{hidden ? "••••" : `+${fmt(h.net)}`} <span className="text-xs font-normal text-gray-400">birr</span></span>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>Sales: {hidden ? "••" : fmt(h.sales)}</span>
                  <span>Spent: {hidden ? "••" : fmt(h.exp)}</span>
                </div>
              </div>
            ))}
            <button className="w-full py-3 rounded-2xl text-sm font-semibold mt-2" style={{ background: "#fff", border: "1px solid #e8c87a", color: "#c08020" }}>
              📤 Export CSV
            </button>
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex-shrink-0 flex justify-around items-center px-4 py-2 border-t" style={{ background: "#fff", borderColor: "#f0e6d4" }}>
        {([ ["today", "🏪", "ዛሬ"], ["merro", "📋", "ሜሮ"], ["history", "📅", "ታሪክ"] ] as const).map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key)} className="flex flex-col items-center gap-0.5 py-1.5 px-5 rounded-xl"
            style={{ background: tab === key ? "#fffbeb" : "transparent" }}>
            <span className="text-xl">{icon}</span>
            <span className="text-xs font-semibold" style={{ color: tab === key ? "#c08020" : "#9ca3af" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

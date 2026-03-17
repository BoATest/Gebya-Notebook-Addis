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

// Design 3 — "Addis Clean": crisp white, minimal, teal accent, sidebar tab strip
export function AccountingBook() {
  const [tab, setTab] = useState<Tab>("today");
  const [hidden, setHidden] = useState(false);
  const mask = (n: number) => (hidden ? "••••" : fmt(n));

  const urgencyColor: Record<string, string> = {
    red: "#ef4444", yellow: "#f59e0b", green: "#10b981",
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <div className="px-5 pt-10 pb-4 flex-shrink-0" style={{ background: "#fff", borderBottom: "1px solid #f0f0f0" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black" style={{ background: "#d97706", color: "#fff" }}>
              ገ
            </div>
            <div>
              <div className="font-black text-lg text-gray-900">ገበያ</div>
              <div className="text-xs text-gray-400">{D.date}</div>
            </div>
          </div>
          <button onClick={() => setHidden(h => !h)} className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ background: "#f5f5f5", color: "#666" }}>
            {hidden ? "👁 Show" : "🙈 Hide"}
          </button>
        </div>

        {/* Summary row */}
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl p-3" style={{ background: "#f0fdf4" }}>
            <div className="text-xs text-gray-500">Sales</div>
            <div className="font-black text-lg" style={{ color: "#16a34a" }}>{mask(D.sales)}</div>
          </div>
          <div className="flex-1 rounded-xl p-3" style={{ background: "#fef2f2" }}>
            <div className="text-xs text-gray-500">Spent</div>
            <div className="font-black text-lg text-red-500">{mask(D.expenses)}</div>
          </div>
          <div className="flex-1 rounded-xl p-3" style={{ background: "#fffbeb" }}>
            <div className="text-xs text-gray-500">Profit</div>
            <div className="font-black text-lg" style={{ color: "#d97706" }}>{mask(D.net)}</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2.5 flex gap-2 flex-shrink-0" style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
        {[
          { label: "I Sold", amharic: "ሸጠሁ", color: "#16a34a" },
          { label: "I Spent", amharic: "ወጪ", color: "#ef4444" },
          { label: "Credit", amharic: "ሜሮ", color: "#d97706" },
        ].map(b => (
          <button key={b.label} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: "#fff", border: `1.5px solid ${b.color}33`, color: b.color }}>
            <span>+</span>
            <span>{b.amharic}</span>
          </button>
        ))}
      </div>

      {/* Tab navigation - underline style */}
      <div className="px-4 flex gap-0 flex-shrink-0" style={{ borderBottom: "1px solid #f0f0f0" }}>
        {([ ["today", "Today"], ["merro", "Merro"], ["history", "History"] ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className="flex-1 py-3 text-sm font-semibold relative"
            style={{ color: tab === key ? "#d97706" : "#9ca3af" }}>
            {label}
            {tab === key && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#d97706" }} />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {tab === "today" && D.entries.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "#fafafa" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: e.type === "sale" ? "#dcfce7" : e.type === "expense" ? "#fee2e2" : "#fef9c3" }}>
              {e.type === "sale" ? "📦" : e.type === "expense" ? "💸" : "📋"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-800 truncate">{e.label}</div>
              {e.type === "credit" && <div className="text-xs text-amber-500">Due in {(e as any).due}</div>}
              {e.type === "sale" && (e as any).profit && <div className="text-xs text-green-500">+{hidden ? "••" : fmt((e as any).profit)} profit</div>}
            </div>
            <div className="font-bold text-sm" style={{ color: e.type === "sale" ? "#16a34a" : e.type === "expense" ? "#ef4444" : "#d97706" }}>
              {hidden ? "••••" : `${e.type === "expense" ? "-" : "+"}${fmt(e.amount)}`}
            </div>
          </div>
        ))}

        {tab === "merro" && D.merro.map((m, i) => (
          <div key={i} className="rounded-xl px-4 py-3" style={{ background: "#fafafa" }}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-gray-800">{m.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: urgencyColor[m.urgency] }} />
                  <span className="text-xs text-gray-400">{m.due}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-gray-800">{hidden ? "••••" : fmt(m.remaining)} <span className="text-xs font-normal text-gray-400">birr</span></div>
                <div className="text-xs text-gray-400">{Math.round(((m.total - m.remaining) / m.total) * 100)}% paid</div>
              </div>
            </div>
          </div>
        ))}

        {tab === "history" && (
          <>
            {D.history.map((h, i) => (
              <div key={i} className="rounded-xl px-4 py-3" style={{ background: "#fafafa" }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700 text-sm">{h.day}</span>
                  <span className="font-bold text-sm" style={{ color: "#16a34a" }}>{hidden ? "••••" : `+${fmt(h.net)}`} birr</span>
                </div>
                <div className="text-xs text-gray-400">Sales {hidden ? "••" : fmt(h.sales)} · Spent {hidden ? "••" : fmt(h.exp)}</div>
              </div>
            ))}
            <button className="w-full mt-2 py-3 rounded-xl text-sm font-semibold" style={{ border: "1.5px solid #d97706", color: "#d97706", background: "transparent" }}>
              📤 Export CSV
            </button>
          </>
        )}
      </div>
    </div>
  );
}

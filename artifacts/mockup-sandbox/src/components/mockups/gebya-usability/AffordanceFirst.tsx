import { useState } from "react";

// USABILITY VARIANT 2 — INTERACTION & AFFORDANCE VISIBILITY
// Tradeoff: Every tappable element looks obviously pressable — raised buttons,
// chevrons on list rows, a large FAB for the primary action, pill-shaped active
// nav indicator. The header is shorter to give more room to the action area.
// Cost: The profit summary is less dominant; interaction chrome takes space.

type Tab = "today" | "merro" | "history";

const D = {
  date: "8 ጥቅምት 2017",
  sales: 2450, expenses: 680, net: 1770,
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
  ],
};

const fmt = (n: number) => n.toLocaleString();

export function AffordanceFirst() {
  const [tab, setTab] = useState<Tab>("today");
  const [hidden, setHidden] = useState(false);
  const m = (n: number) => hidden ? "••••" : fmt(n);

  const urgencyColor: Record<string, string> = { red: "#dc2626", yellow: "#ca8a04", green: "#15803d" };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", background: "#fdf8f0" }}>

      {/* Compact header */}
      <div className="px-5 pt-10 pb-4 flex-shrink-0" style={{ background: "#c47c1a" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-black text-white text-xl">ገበያ</span>
            <span className="ml-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{D.date}</span>
          </div>
          <button onClick={() => setHidden(h => !h)} className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "rgba(0,0,0,0.2)", color: "#fff" }}>
            {hidden ? "Show" : "Hide"}
          </button>
        </div>
        <div className="flex gap-2">
          {[
            { label: "Profit", val: m(D.net), color: "#bbf7d0", text: "#14532d" },
            { label: "Sales", val: m(D.sales), color: "rgba(255,255,255,0.15)", text: "#fff" },
            { label: "Spent", val: m(D.expenses), color: "rgba(0,0,0,0.12)", text: "rgba(255,255,255,0.85)" },
          ].map(s => (
            <div key={s.label} className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: s.color }}>
              <div className="text-xs mb-0.5 opacity-70" style={{ color: s.text }}>{s.label}</div>
              <div className="font-black text-sm" style={{ color: s.text }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Prominent action buttons — clearly look tappable */}
      <div className="px-4 py-3 flex-shrink-0" style={{ background: "#e8901e" }}>
        <div className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>What happened today?</div>
        <div className="flex gap-2">
          {[
            { label: "ሸጠሁ", sub: "I Sold", bg: "#15803d", shadow: "#14532d" },
            { label: "ወጪ", sub: "I Spent", bg: "#dc2626", shadow: "#7f1d1d" },
            { label: "ሜሮ", sub: "Credit", bg: "#b45309", shadow: "#78350f" },
          ].map(b => (
            <button key={b.label} className="flex-1 py-3 rounded-2xl text-center flex flex-col items-center"
              style={{ background: b.bg, boxShadow: `0 4px 0 ${b.shadow}` }}>
              <span className="font-black text-white text-lg leading-none">+</span>
              <span className="font-bold text-white text-sm">{b.label}</span>
              <span className="text-xs text-white opacity-70">{b.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content — list rows with clear tap targets & chevrons */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {tab === "today" && (
          <>
            <div className="text-xs font-bold tracking-widest uppercase px-1 mb-2 text-gray-400">Today's Entries</div>
            {D.entries.map((e, i) => (
              // Minimum 56px height; chevron signals tappability
              <button key={i} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left"
                style={{ background: "#fff", border: "1px solid #ede0cc", minHeight: 56 }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: e.type === "sale" ? "#dcfce7" : e.type === "expense" ? "#fee2e2" : "#fef9c3" }}>
                  {e.type === "sale" ? "📦" : e.type === "expense" ? "💸" : "📋"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800 truncate">{e.label}</div>
                  {e.type === "credit" && <div className="text-xs text-amber-600">Due in {(e as any).due}</div>}
                  {e.type === "sale" && (e as any).profit && <div className="text-xs text-green-600">+{hidden ? "••" : fmt((e as any).profit)} profit</div>}
                </div>
                <div className="text-right mr-1">
                  <div className="font-bold text-sm" style={{ color: e.type === "sale" ? "#15803d" : e.type === "expense" ? "#dc2626" : "#c47c1a" }}>
                    {hidden ? "••••" : `${e.type === "expense" ? "-" : "+"}${fmt(e.amount)}`}
                  </div>
                  <div className="text-xs text-gray-400">birr</div>
                </div>
                {/* Chevron — signals row is tappable */}
                <span className="text-gray-300 font-bold text-lg flex-shrink-0">›</span>
              </button>
            ))}
          </>
        )}

        {tab === "merro" && D.merro.map((r, i) => (
          <button key={i} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left"
            style={{ background: "#fff", border: "1px solid #ede0cc", minHeight: 64 }}>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: urgencyColor[r.urgency] }} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800">{r.name}</div>
              <div className="text-xs font-medium" style={{ color: urgencyColor[r.urgency] }}>{r.due}</div>
            </div>
            <div className="text-right mr-1">
              <div className="font-black text-lg text-gray-800">{m(r.remaining)}</div>
              <div className="text-xs text-gray-400">birr</div>
            </div>
            <span className="text-gray-300 font-bold text-lg flex-shrink-0">›</span>
          </button>
        ))}

        {tab === "history" && D.history.map((h, i) => (
          <button key={i} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left"
            style={{ background: "#fff", border: `1px solid ${i === 0 ? "#fde68a" : "#ede0cc"}`, minHeight: 64 }}>
            <div className="flex-1">
              <div className="font-semibold text-gray-700 text-sm">{h.day}</div>
              <div className="text-xs text-gray-400 mt-0.5">Sales {m(h.sales)} · Spent {m(h.exp)}</div>
            </div>
            <div className="text-right mr-1">
              <div className="font-black text-lg" style={{ color: "#15803d" }}>+{m(h.net)}</div>
              <div className="text-xs text-gray-400">birr</div>
            </div>
            <span className="text-gray-300 font-bold text-lg flex-shrink-0">›</span>
          </button>
        ))}
      </div>

      {/* Bottom nav — pill indicator makes active state unmissable */}
      <div className="flex-shrink-0 flex justify-around items-center px-2 pt-2 pb-6" style={{ background: "#fff", borderTop: "1px solid #f0e6d4" }}>
        {([["today","🏪","ዛሬ","Today"],["merro","📋","ሜሮ","Credit"],["history","📅","ታሪክ","History"]] as const).map(([key, icon, am, en]) => (
          <button key={key} onClick={() => setTab(key)} className="flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-2xl transition-all"
            style={{
              background: tab === key ? "#c47c1a" : "transparent",
              boxShadow: tab === key ? "0 2px 8px rgba(196,124,26,0.35)" : "none",
            }}>
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-bold" style={{ color: tab === key ? "#fff" : "#9ca3af" }}>{am}</span>
            <span className="text-xs" style={{ color: tab === key ? "rgba(255,255,255,0.7)" : "#d1d5db" }}>{en}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

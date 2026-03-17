import { useState } from "react";

const DATA = {
  date: "8 ጥቅምት 2017",
  sales: 2450,
  expenses: 680,
  net: 1770,
  entries: [
    { id: 1, type: "sale", label: "Injera (40 pcs)", amount: 850, profit: 320 },
    { id: 2, type: "sale", label: "Sugar (5 kg)", amount: 650, profit: 200 },
    { id: 3, type: "sale", label: "Cooking Oil", amount: 500, profit: 150 },
    { id: 4, type: "sale", label: "Berbere Spice", amount: 450, profit: 130 },
    { id: 5, type: "expense", label: "Market Fee", amount: 180 },
    { id: 6, type: "expense", label: "Transport", amount: 500 },
    { id: 7, type: "credit", label: "Abebe Bekele", amount: 1200, dueIn: 3 },
  ],
  merro: [
    { name: "Abebe Bekele", amount: 1200, remaining: 1200, dueIn: 3, urgency: "yellow" },
    { name: "Tigist M.", amount: 900, remaining: 450, dueIn: -1, urgency: "red" },
    { name: "Dawit G.", amount: 600, remaining: 600, dueIn: 12, urgency: "green" },
  ],
  history: [
    { day: "ዛሬ - 8 ጥቅምት", sales: 2450, expenses: 680, net: 1770 },
    { day: "7 ጥቅምት", sales: 3100, expenses: 420, net: 2680 },
    { day: "6 ጥቅምት", sales: 1850, expenses: 950, net: 900 },
    { day: "5 ጥቅምት", sales: 2200, expenses: 310, net: 1890 },
  ],
};

type Tab = "today" | "merro" | "history";
type Urgency = "red" | "yellow" | "green";

const urgencyStyle: Record<Urgency, string> = {
  red: "bg-red-100 text-red-700 border-red-300",
  yellow: "bg-amber-100 text-amber-700 border-amber-300",
  green: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

function fmt(n: number) {
  return n.toLocaleString();
}

export function TheSouk() {
  const [tab, setTab] = useState<Tab>("today");
  const [hidden, setHidden] = useState(true);

  const mask = (n: number) => (hidden ? "••••" : `${fmt(n)} ብር`);

  return (
    <div
      className="relative flex flex-col h-screen overflow-hidden select-none"
      style={{ background: "#0f1923", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Gradient header */}
      <div
        className="relative px-5 pt-10 pb-6 overflow-hidden flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #1a6b3c 0%, #0f4d2c 40%, #0f3d1f 100%)",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: "#4ade80" }}
        />
        <div
          className="absolute top-4 -right-4 w-20 h-20 rounded-full opacity-10"
          style={{ background: "#86efac" }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "#86efac" }}
            >
              {DATA.date}
            </span>
            <button
              onClick={() => setHidden((h) => !h)}
              className="text-xs px-3 py-1 rounded-full font-semibold border"
              style={{ borderColor: "#86efac", color: "#86efac" }}
            >
              {hidden ? "👁 Show" : "🙈 Hide"}
            </button>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-white text-4xl font-black tracking-tight">ገበያ</span>
            <span className="text-xs font-medium" style={{ color: "#86efac" }}>
              Notebook
            </span>
          </div>

          {/* Summary pills */}
          <div className="flex gap-2 mt-4">
            <div
              className="flex-1 rounded-2xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <div className="text-xs mb-1" style={{ color: "#86efac" }}>
                Sales
              </div>
              <div className="font-black text-white text-sm">{mask(DATA.sales)}</div>
            </div>
            <div
              className="flex-1 rounded-2xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <div className="text-xs mb-1" style={{ color: "#fca5a5" }}>
                Spent
              </div>
              <div className="font-black text-white text-sm">{mask(DATA.expenses)}</div>
            </div>
            <div
              className="flex-1 rounded-2xl p-3 text-center border"
              style={{
                background: "rgba(74,222,128,0.15)",
                borderColor: "rgba(74,222,128,0.4)",
              }}
            >
              <div className="text-xs mb-1" style={{ color: "#86efac" }}>
                Profit
              </div>
              <div className="font-black text-sm" style={{ color: "#4ade80" }}>
                {mask(DATA.net)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="px-5 py-3 flex gap-2 flex-shrink-0"
        style={{ background: "#131f2b" }}
      >
        {[
          { label: "+ ሸጠሁ", sub: "I Sold", color: "#16a34a", bg: "rgba(22,163,74,0.15)" },
          { label: "+ ወጪ", sub: "I Spent", color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
          { label: "+ ሜሮ", sub: "Credit", color: "#2563eb", bg: "rgba(37,99,235,0.15)" },
        ].map((btn) => (
          <button
            key={btn.label}
            className="flex-1 rounded-2xl py-3 text-center transition-all active:scale-95"
            style={{ background: btn.bg, border: `1.5px solid ${btn.color}33` }}
          >
            <div className="font-bold text-sm" style={{ color: btn.color }}>
              {btn.label}
            </div>
            <div className="text-xs mt-0.5 text-gray-400">{btn.sub}</div>
          </button>
        ))}
      </div>

      {/* Main scrollable area */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {tab === "today" && (
          <>
            <div className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-3">
              Today's Activity
            </div>
            {DATA.entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "#1c2d3e" }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{
                    background:
                      e.type === "sale"
                        ? "rgba(22,163,74,0.2)"
                        : e.type === "expense"
                          ? "rgba(220,38,38,0.15)"
                          : "rgba(37,99,235,0.15)",
                  }}
                >
                  {e.type === "sale" ? "📦" : e.type === "expense" ? "💸" : "📋"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold truncate">
                    {e.label}
                  </div>
                  {e.type === "credit" && (
                    <div className="text-xs text-yellow-500">Due in {e.dueIn} days</div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className="font-bold text-sm"
                    style={{
                      color:
                        e.type === "sale"
                          ? "#4ade80"
                          : e.type === "expense"
                            ? "#f87171"
                            : "#60a5fa",
                    }}
                  >
                    {hidden
                      ? "••••"
                      : `${e.type === "expense" ? "-" : "+"}${fmt(e.amount)}`}
                  </div>
                  {e.type === "sale" && e.profit && (
                    <div className="text-xs text-green-600">
                      +{hidden ? "••" : fmt(e.profit)} profit
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "merro" && (
          <>
            <div className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-3">
              Credit Owed to You
            </div>
            <div
              className="rounded-2xl p-4 mb-2"
              style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)" }}
            >
              <div className="text-xs text-blue-400 mb-1">Total outstanding</div>
              <div className="font-black text-2xl text-blue-300">
                {hidden ? "••••" : `${fmt(DATA.merro.reduce((a, m) => a + m.remaining, 0))} ብር`}
              </div>
            </div>
            {DATA.merro.map((m) => (
              <div
                key={m.name}
                className="rounded-2xl p-4"
                style={{ background: "#1c2d3e" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-white font-bold">{m.name}</div>
                    <div className="text-xs text-gray-400">
                      {m.dueIn < 0
                        ? `${Math.abs(m.dueIn)} days overdue`
                        : `Due in ${m.dueIn} days`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-white text-lg">
                      {hidden ? "••••" : `${fmt(m.remaining)} ብር`}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${urgencyStyle[m.urgency as Urgency]}`}
                    >
                      {m.urgency === "red"
                        ? "Urgent"
                        : m.urgency === "yellow"
                          ? "Soon"
                          : "OK"}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#0f1923" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(((m.amount - m.remaining) / m.amount) * 100)}%`,
                      background:
                        m.urgency === "red"
                          ? "#ef4444"
                          : m.urgency === "yellow"
                            ? "#f59e0b"
                            : "#22c55e",
                    }}
                  />
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "history" && (
          <>
            <div className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-3">
              Recent Days
            </div>
            {DATA.history.map((h, i) => (
              <div
                key={i}
                className="rounded-2xl p-4"
                style={{
                  background: i === 0 ? "rgba(22,163,74,0.1)" : "#1c2d3e",
                  border: i === 0 ? "1px solid rgba(74,222,128,0.25)" : "1px solid transparent",
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span
                    className="text-sm font-bold"
                    style={{ color: i === 0 ? "#4ade80" : "#94a3b8" }}
                  >
                    {h.day}
                  </span>
                  <span
                    className="font-black text-lg"
                    style={{ color: h.net >= 0 ? "#4ade80" : "#f87171" }}
                  >
                    {hidden ? "••••" : `+${fmt(h.net)} ብር`}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>
                    Sales: {hidden ? "••" : fmt(h.sales)}
                  </span>
                  <span>
                    Spent: {hidden ? "••" : fmt(h.expenses)}
                  </span>
                </div>
              </div>
            ))}
            <button
              className="w-full mt-2 py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "#1c2d3e", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}
            >
              📤 Export CSV
            </button>
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div
        className="flex-shrink-0 flex items-center justify-around px-6 py-3 border-t"
        style={{ background: "#131f2b", borderColor: "#1e3448" }}
      >
        {(
          [
            { key: "today", icon: "🏪", label: "ዛሬ" },
            { key: "merro", icon: "📋", label: "ሜሮ" },
            { key: "history", icon: "📅", label: "ታሪክ" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all"
            style={{
              background: tab === t.key ? "rgba(74,222,128,0.1)" : "transparent",
            }}
          >
            <span className="text-xl">{t.icon}</span>
            <span
              className="text-xs font-bold"
              style={{
                color: tab === t.key ? "#4ade80" : "#4b5563",
              }}
            >
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

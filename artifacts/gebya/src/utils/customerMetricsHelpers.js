// Pure, self-contained formatting helpers used by customerMetrics.js.
// No module-level state; safe to extract and re-import.

export function fmtCsvTimestamp(ts) {
  if (!ts) return ['', ''];
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return ['', ''];
  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().split(" ")[0];
  return [date, time];
}

export function fmtCsvType(raw) {
  if (raw === "credit_add") return "Credit";
  if (raw === "payment") return "Payment";
  if (raw === "reversal") return "Reversal";
  return raw || "";
}

export function escapeCsv(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function fmtBirr(n) {
  return "birr " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

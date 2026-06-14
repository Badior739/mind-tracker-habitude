import { ACTIVITIES, MONTHS, daysInMonth, type DayEntry, type FinanceLine, CATEGORY_META } from "./mind-data";

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function download(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportActivitiesCSV(year: number, month: number) {
  const dim = daysInMonth(year, month);
  const data: Record<number, DayEntry> = (() => {
    try { return JSON.parse(localStorage.getItem(`mt.act.${year}-${month}`) || "{}"); }
    catch { return {}; }
  })();
  const head = ["Jour", "Réveil", ...ACTIVITIES.map(a => a.label), "Score /11", "%", "Notes"];
  const rows = [head.map(csvEscape).join(";")];
  for (let d = 1; d <= dim; d++) {
    const e = data[d] || {};
    const score = ACTIVITIES.reduce((s, a) => s + (e[a.key] ? 1 : 0), 0);
    const p = ((score / ACTIVITIES.length) * 100).toFixed(0) + "%";
    rows.push([
      `${String(d).padStart(2,"0")}/${String(month+1).padStart(2,"0")}/${year}`,
      e.reveil || "",
      ...ACTIVITIES.map(a => e[a.key] ? "✓" : ""),
      score, p, e.notes || ""
    ].map(csvEscape).join(";"));
  }
  download(`mind-tracker_activites_${MONTHS[month]}-${year}.csv`, rows.join("\n"));
}

export function exportFinanceCSV(year: number, month: number) {
  const lines: FinanceLine[] = (() => {
    try { return JSON.parse(localStorage.getItem(`mt.fin.lines.${year}-${month}`) || "[]"); }
    catch { return []; }
  })();
  const head = ["Catégorie","Poste","Budget","Réel","Écart","Notes"];
  const rows = [head.map(csvEscape).join(";")];
  for (const l of lines) {
    rows.push([
      CATEGORY_META[l.category].label,
      `${l.emoji} ${l.label}`,
      l.budget, l.reel, l.reel - l.budget, l.notes || "",
    ].map(csvEscape).join(";"));
  }
  download(`mind-tracker_finances_${MONTHS[month]}-${year}.csv`, rows.join("\n"));
}

/** Ouvre la boîte de dialogue d'impression (utilisateur choisit "Enregistrer en PDF"). */
export function printToPDF() {
  window.print();
}
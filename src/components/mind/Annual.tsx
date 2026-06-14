import { useMemo } from "react";
import { ACTIVITIES, MONTHS_SHORT, daysInMonth, type DayEntry } from "@/lib/mind-data";
import { Panel, NumberInput, ProgressBar } from "./ui";
import { useLocalStorage } from "@/lib/storage";

function readMonth(year: number, m: number): Record<number, DayEntry> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(`mt.act.${year}-${m}`) || "{}"); }
  catch { return {}; }
}

export function AnnualView() {
  const [year, setYear] = useLocalStorage("mt.act.year", new Date().getFullYear());

  const months = useMemo(() => Array.from({ length: 12 }, (_, m) => {
    const data = readMonth(year, m);
    const dim = daysInMonth(year, m);
    let total = 0, filled = 0;
    const perAct: Record<string, number> = {};
    for (let d = 1; d <= dim; d++) {
      const e = data[d] || {};
      let s = 0;
      for (const a of ACTIVITIES) { if (e[a.key]) { s++; perAct[a.key] = (perAct[a.key]||0)+1; } }
      total += s;
      if (s > 0) filled++;
    }
    return { avg: total / dim, pct: (total / (dim*ACTIVITIES.length))*100, filled, dim, perAct };
  }), [year]);

  const yearScore = months.reduce((a,m)=>a+m.avg,0)/12;
  const yearPct = months.reduce((a,m)=>a+m.pct,0)/12;

  return (
    <div className="space-y-6">
      <Panel
        title={<>Synthèse annuelle</>}
        action={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Année</span>
            <NumberInput value={year} onChange={setYear} className="w-24" />
          </div>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Metric label="Score annuel moyen" value={`${yearScore.toFixed(2)}/11`} tone="primary" />
          <Metric label="% Réussite annuelle" value={`${yearPct.toFixed(1)}%`} tone="accent" />
          <Metric label="Meilleur mois" value={MONTHS_SHORT[months.reduce((bi,m,i,arr)=>m.avg>arr[bi].avg?i:bi,0)]} tone="success" />
          <Metric label="À renforcer" value={MONTHS_SHORT[months.reduce((wi,m,i,arr)=>m.avg<arr[wi].avg?i:wi,0)]} tone="warning" />
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium">Indicateur / Mois</th>
                {MONTHS_SHORT.map((m) => <th key={m} className="py-2 text-center font-medium">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 font-medium">⭐ Score moyen /11</td>
                {months.map((m,i) => <td key={i} className="py-2 text-center text-primary font-semibold">{m.avg ? m.avg.toFixed(1) : "—"}</td>)}
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 font-medium">📊 % Réussite</td>
                {months.map((m,i) => (
                  <td key={i} className="py-2 px-1">
                    <div className="text-center text-[11px] mb-1 text-muted-foreground">{m.pct ? m.pct.toFixed(0)+"%" : "—"}</div>
                    <ProgressBar value={m.pct} tone={m.pct>=75?"success":m.pct>=50?"primary":m.pct>=25?"warning":"destructive"} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 font-medium">📅 Jours actifs</td>
                {months.map((m,i) => <td key={i} className="py-2 text-center text-muted-foreground">{m.filled}/{m.dim}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Progression par activité (année)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACTIVITIES.map((a) => {
            const total = months.reduce((s,m) => s + (m.perAct[a.key]||0), 0);
            const possible = months.reduce((s,_,i) => s + daysInMonth(year, i), 0);
            const p = (total/possible)*100;
            return (
              <div key={a.key} className="rounded-xl border border-border p-4" style={{ background: "var(--gradient-card)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{a.emoji}</span>
                    <span className="text-sm font-medium">{a.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{total}/{possible}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={p} tone={p>=75?"success":p>=50?"primary":p>=25?"warning":"destructive"} />
                  <span className="text-xs font-semibold tabular-nums w-12 text-right">{p.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "primary"|"accent"|"success"|"warning" }) {
  const toneText = { primary: "text-primary", accent: "text-accent", success: "text-[color:var(--success)]", warning: "text-[color:var(--warning)]" }[tone];
  return (
    <div className="rounded-xl border border-border p-4" style={{ background: "var(--gradient-card)" }}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneText}`}>{value}</div>
    </div>
  );
}
import { useMemo } from "react";
import { MONTHS_SHORT, type FinanceLine } from "@/lib/mind-data";
import { useLocalStorage, fmtCFA } from "@/lib/storage";
import { Panel, NumberInput, ProgressBar } from "./ui";

function readFin(year: number, m: number): FinanceLine[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`mt.fin.lines.${year}-${m}`);
    return raw ? JSON.parse(raw) as FinanceLine[] : null;
  } catch { return null; }
}

export function HistoryView() {
  const [year, setYear] = useLocalStorage("mt.fin.year", new Date().getFullYear());

  const data = useMemo(() => Array.from({ length: 12 }, (_, m) => {
    const lines = readFin(year, m);
    if (!lines) return { rev: 0, dep: 0, solde: 0, ess: 0, inv: 0, epa: 0 };
    const sum = (cat: string) => lines.filter(l => l.category === cat).reduce((s,l) => s + (l.reel||0), 0);
    const rev = sum("revenus");
    const ess = sum("essentiel"), inv = sum("investissement"), epa = sum("epargne");
    const dep = ess + inv + epa;
    return { rev, dep, solde: rev - dep, ess, inv, epa };
  }), [year]);

  const totals = data.reduce((a,m) => ({
    rev: a.rev + m.rev, dep: a.dep + m.dep, solde: a.solde + m.solde,
    ess: a.ess + m.ess, inv: a.inv + m.inv, epa: a.epa + m.epa,
  }), { rev:0, dep:0, solde:0, ess:0, inv:0, epa:0 });

  const maxAbs = Math.max(...data.map(d => Math.max(d.rev, d.dep))) || 1;

  const rows: { label: string; key: keyof typeof totals; tone: "success"|"destructive"|"primary"|"accent"|"warning" }[] = [
    { label: "💵 Revenus",        key: "rev",   tone: "success" },
    { label: "📤 Dépenses",       key: "dep",   tone: "destructive" },
    { label: "💰 Solde net",      key: "solde", tone: "primary" },
    { label: "🏠 Essentielles",   key: "ess",   tone: "warning" },
    { label: "🎓 Investissements",key: "inv",   tone: "accent" },
    { label: "🏦 Épargne",        key: "epa",   tone: "primary" },
  ];

  return (
    <div className="space-y-6">
      <Panel
        title={<>Historique financier annuel</>}
        action={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Année</span>
            <NumberInput value={year} onChange={setYear} className="w-24" />
          </div>
        }
      >
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium min-w-[160px]">Indicateur</th>
                {MONTHS_SHORT.map((m) => <th key={m} className="py-2 text-center font-medium">{m}</th>)}
                <th className="py-2 text-center font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-border">
                  <td className="py-2 font-medium">{r.label}</td>
                  {data.map((d,i) => (
                    <td key={i} className="py-2 px-1 text-center tabular-nums text-foreground/90">
                      {d[r.key] ? fmtCFA(d[r.key]) : "—"}
                    </td>
                  ))}
                  <td className="py-2 text-center tabular-nums font-semibold text-foreground">
                    {fmtCFA(totals[r.key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Revenus vs Dépenses — visualisation">
        <div className="grid grid-cols-12 gap-2 items-end h-56">
          {data.map((d, i) => {
            const hR = (d.rev / maxAbs) * 100;
            const hD = (d.dep / maxAbs) * 100;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex items-end gap-0.5 h-44 w-full">
                  <div className="flex-1 bg-[color:var(--success)]/70 rounded-t" style={{ height: `${hR}%` }} title={`Revenus ${fmtCFA(d.rev)}`}/>
                  <div className="flex-1 bg-destructive/70 rounded-t" style={{ height: `${hD}%` }} title={`Dépenses ${fmtCFA(d.dep)}`}/>
                </div>
                <div className="text-[10px] text-muted-foreground">{MONTHS_SHORT[i]}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-[color:var(--success)]/70"/>Revenus</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-destructive/70"/>Dépenses</div>
        </div>
      </Panel>

      <Panel title="Évolution solde net">
        <div className="space-y-2">
          {data.map((d, i) => {
            const max = Math.max(...data.map(x => Math.abs(x.solde))) || 1;
            const w = (Math.abs(d.solde) / max) * 100;
            return (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="w-10 text-muted-foreground">{MONTHS_SHORT[i]}</span>
                <div className="flex-1">
                  <ProgressBar value={w} tone={d.solde >= 0 ? "success" : "destructive"} />
                </div>
                <span className={`w-28 text-right tabular-nums font-medium ${d.solde >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}>
                  {fmtCFA(d.solde)}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
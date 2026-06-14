import { useMemo } from "react";
import { ACTIVITIES, MONTHS, daysInMonth, type DayEntry, type FinanceLine } from "@/lib/mind-data";
import { useLocalStorage, fmtCFA, pct } from "@/lib/storage";
import { StatCard, Panel, ProgressBar } from "./ui";
import { Activity, Wallet, TrendingUp, TrendingDown, Target, Sparkles } from "lucide-react";

function readMonthAct(year: number, m: number): Record<number, DayEntry> {
  try { return JSON.parse(window.localStorage.getItem(`mt.act.${year}-${m}`) || "{}"); }
  catch { return {}; }
}
function readFin(year: number, m: number): FinanceLine[] {
  try { return JSON.parse(window.localStorage.getItem(`mt.fin.lines.${year}-${m}`) || "[]") as FinanceLine[]; }
  catch { return []; }
}

export function DashboardView({ goto }: { goto: (k: any) => void }) {
  const today = new Date();
  const [year] = useLocalStorage("mt.act.year", today.getFullYear());
  const [month] = useLocalStorage("mt.act.month", today.getMonth());

  const stats = useMemo(() => {
    if (typeof window === "undefined") return null;
    const act = readMonthAct(year, month);
    const dim = daysInMonth(year, month);
    let total = 0, activeDays = 0;
    const perAct: Record<string, number> = {};
    for (let d = 1; d <= dim; d++) {
      const e = act[d] || {}; let s = 0;
      for (const a of ACTIVITIES) if (e[a.key]) { s++; perAct[a.key]=(perAct[a.key]||0)+1; }
      total += s; if (s) activeDays++;
    }
    const avg = total / dim;
    const pctScore = (total / (dim*ACTIVITIES.length))*100;

    const fin = readFin(year, month);
    const sum = (c: string) => fin.filter(l => l.category===c).reduce((s,l)=>s+(l.reel||0),0);
    const rev = sum("revenus");
    const ess = sum("essentiel"), inv = sum("investissement"), epa = sum("epargne");
    const dep = ess + inv + epa;
    const solde = rev - dep;
    const tx = rev ? epa/rev : 0;

    return { avg, pctScore, total, activeDays, dim, perAct, rev, dep, solde, tx, epa };
  }, [year, month]);

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl border border-border p-6 lg:p-8"
        style={{ background: "var(--gradient-card)" }}
      >
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
             style={{ background: "var(--gradient-primary)" }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-2">
            <Sparkles className="h-3.5 w-3.5"/> {MONTHS[month]} {year}
          </div>
          <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight">Bâtir Mind Graphix Solution, un jour à la fois.</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Vue d'ensemble de votre discipline quotidienne et de votre santé financière du mois en cours.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Score moyen" value={`${stats.avg.toFixed(2)}/11`} sub={`${stats.activeDays}/${stats.dim} jours actifs`} tone="primary" icon={<Activity className="h-5 w-5"/>} />
        <StatCard label="% Réussite" value={`${stats.pctScore.toFixed(1)}%`} sub="Discipline globale" tone="accent" icon={<Target className="h-5 w-5"/>} />
        <StatCard label="Solde net" value={fmtCFA(stats.solde)} sub={`${fmtCFA(stats.rev)} – ${fmtCFA(stats.dep)}`} tone={stats.solde>=0?"success":"destructive"} icon={stats.solde>=0?<TrendingUp className="h-5 w-5"/>:<TrendingDown className="h-5 w-5"/>} />
        <StatCard label="Taux d'épargne" value={pct(stats.tx)} sub={`Épargne : ${fmtCFA(stats.epa)}`} tone="primary" icon={<Wallet className="h-5 w-5"/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Performance par activité (mois courant)"
               action={<button onClick={() => goto("activities")} className="text-xs text-primary hover:underline">Saisir →</button>}>
          <div className="space-y-3">
            {ACTIVITIES.map((a) => {
              const v = stats.perAct[a.key] || 0;
              const p = (v/stats.dim)*100;
              return (
                <div key={a.key} className="flex items-center gap-3 text-sm">
                  <span className="text-base w-6">{a.emoji}</span>
                  <span className="flex-1 truncate">{a.label}</span>
                  <div className="w-28 lg:w-40"><ProgressBar value={p} tone={p>=75?"success":p>=50?"primary":p>=25?"warning":"destructive"} /></div>
                  <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">{v}/{stats.dim}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Répartition financière du mois"
               action={<button onClick={() => goto("finances")} className="text-xs text-primary hover:underline">Détails →</button>}>
          <FinanceDonut year={year} month={month} />
        </Panel>
      </div>
    </div>
  );
}

function FinanceDonut({ year, month }: { year: number; month: number }) {
  const fin = useMemo(() => readFin(year, month), [year, month]);
  const sum = (c: string) => fin.filter(l => l.category===c).reduce((s,l)=>s+(l.reel||0),0);
  const slices = [
    { label: "Essentielles", value: sum("essentiel"), color: "oklch(0.62 0.22 25)" },
    { label: "Investissements", value: sum("investissement"), color: "oklch(0.7 0.18 200)" },
    { label: "Épargne", value: sum("epargne"), color: "oklch(0.78 0.16 175)" },
  ];
  const total = slices.reduce((s,x)=>s+x.value,0) || 1;
  let acc = 0;
  const C = 2 * Math.PI * 60;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
        <circle cx="80" cy="80" r="60" fill="none" stroke="oklch(0.25 0.025 250)" strokeWidth="22" />
        {slices.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * C;
          const el = (
            <circle key={i} cx="80" cy="80" r="60" fill="none"
              stroke={s.color} strokeWidth="22"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-acc}
            />
          );
          acc += dash;
          return el;
        })}
      </svg>
      <div className="flex-1 space-y-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />
              <span>{s.label}</span>
            </div>
            <span className="tabular-nums text-muted-foreground">{fmtCFA(s.value)}</span>
          </div>
        ))}
        <div className="pt-2 mt-2 border-t border-border flex items-center justify-between text-sm">
          <span className="font-medium">Total dépensé</span>
          <span className="tabular-nums font-semibold">{fmtCFA(slices.reduce((a,b)=>a+b.value,0))}</span>
        </div>
      </div>
    </div>
  );
}
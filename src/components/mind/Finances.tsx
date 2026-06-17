import { useMemo } from "react";
import { CATEGORY_META, DEFAULT_FINANCE_LINES, MONTHS, type FinanceCategory, type FinanceLine } from "@/lib/mind-data";
import { useLocalStorage, fmtCFA, pct } from "@/lib/storage";
import { Panel, NumberInput, TextInput, StatCard, ProgressBar } from "./ui";
import { Wallet, TrendingDown, TrendingUp, PiggyBank, Target, ArrowUpRight, ArrowDownRight, Plus, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { toast } from "sonner";

const PIE_COLORS = {
  essentiel: "hsl(var(--destructive))",
  investissement: "hsl(var(--accent))",
  epargne: "hsl(var(--primary))",
};

function DoughnutCard({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-2xl border border-border p-5" style={{ background: "var(--gradient-card)" }}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Répartition dépenses</div>
      <div className="flex items-center gap-4">
        <div className="h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={58}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <ReTooltip formatter={(v: number) => fmtCFA(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="font-semibold text-foreground">{total ? pct(d.value / total, 0) : "0%"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FinancesView() {
  const today = new Date();
  const [year, setYear] = useLocalStorage("mt.fin.year", today.getFullYear());
  const [month, setMonth] = useLocalStorage("mt.fin.month", today.getMonth());
  const [lines, setLines] = useLocalStorage<FinanceLine[]>(
    `mt.fin.lines.${year}-${month}`, DEFAULT_FINANCE_LINES
  );

  // Objectifs d'épargne personnalisables
  const [goals, setGoals] = useLocalStorage<Record<string, number>>("mt.fin.goals", {
    "epa-1": 300000, // 3 mois de dépenses
    "epa-2": 100000, // fonds lancement
  });

  const upd = (id: string, patch: Partial<FinanceLine>) =>
    setLines(lines.map((l) => l.id === id ? { ...l, ...patch } : l));

  const addLine = (category: FinanceCategory) => {
    const emojis: Record<FinanceCategory, string> = { revenus: "💰", essentiel: "🧾", investissement: "🚀", epargne: "🏦" };
    const id = `${category}-${Date.now()}`;
    setLines([...lines, { id, category, emoji: emojis[category], label: "Nouveau poste", budget: 0, reel: 0 }]);
    toast.success("Nouvelle ligne ajoutée", { description: `Catégorie : ${category}` });
  };
  const delLine = (id: string) => {
    const line = lines.find(l => l.id === id);
    if (!line) return;
    if (!window.confirm(`Supprimer « ${line.label} » ?`)) return;
    setLines(lines.filter(l => l.id !== id));
    toast("Ligne supprimée", {
      description: line.label,
      action: { label: "Annuler", onClick: () => setLines((cur) => [...cur, line]) },
    });
  };

  const totals = useMemo(() => {
    const t = (cat: FinanceCategory, k: "budget" | "reel") =>
      lines.filter(l => l.category === cat).reduce((s, l) => s + (l[k] || 0), 0);
    const rev = { budget: t("revenus", "budget"), reel: t("revenus", "reel") };
    const ess = { budget: t("essentiel", "budget"), reel: t("essentiel", "reel") };
    const inv = { budget: t("investissement", "budget"), reel: t("investissement", "reel") };
    const epa = { budget: t("epargne", "budget"), reel: t("epargne", "reel") };
    const depB = ess.budget + inv.budget + epa.budget;
    const depR = ess.reel + inv.reel + epa.reel;
    return {
      rev, ess, inv, epa,
      depB, depR,
      soldeB: rev.budget - depB, soldeR: rev.reel - depR,
      txEpargneR: rev.reel ? epa.reel / rev.reel : 0,
      ratioEssR: rev.reel ? ess.reel / rev.reel : 0,
    };
  }, [lines]);

  // Données mois précédent
  const prevKey = useMemo(() => {
    let py = year, pm = month - 1;
    if (pm < 0) { pm = 11; py--; }
    return `mt.fin.lines.${py}-${pm}`;
  }, [year, month]);

  const prevLines = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(prevKey);
    return raw ? (JSON.parse(raw) as FinanceLine[]) : null;
  }, [prevKey]);

  const prevTotals = useMemo(() => {
    if (!prevLines) return null;
    const t = (cat: FinanceCategory, k: "budget" | "reel") =>
      prevLines.filter(l => l.category === cat).reduce((s, l) => s + (l[k] || 0), 0);
    const revR = t("revenus", "reel");
    const essR = t("essentiel", "reel");
    const invR = t("investissement", "reel");
    const epaR = t("epargne", "reel");
    const depR = essR + invR + epaR;
    return { revR, depR, soldeR: revR - depR };
  }, [prevLines]);

  function Trend({ current, previous, label }: { current: number; previous: number | null; label: string }) {
    if (previous === null) return <span className="text-muted-foreground text-[11px]">—</span>;
    const diff = current - previous;
    const pctChange = previous ? (diff / previous) * 100 : 0;
    const isUp = diff >= 0;
    return (
      <div className="flex items-center gap-1.5 text-[11px]">
        {isUp ? <ArrowUpRight className="h-3 w-3 text-[color:var(--success)]" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
        <span className={isUp ? "text-[color:var(--success)]" : "text-destructive"}>
          {isUp ? "+" : ""}{fmtCFA(diff)} ({isUp ? "+" : ""}{pctChange.toFixed(1)}%)
        </span>
        <span className="text-muted-foreground ml-1">vs mois préc.</span>
      </div>
    );
  }

  const cats: FinanceCategory[] = ["revenus", "essentiel", "investissement", "epargne"];

  const pieData = useMemo(() => {
    return [
      { name: "Essentiel", value: totals.ess.reel, color: PIE_COLORS.essentiel },
      { name: "Investissement", value: totals.inv.reel, color: PIE_COLORS.investissement },
      { name: "Épargne", value: totals.epa.reel, color: PIE_COLORS.epargne },
    ].filter(d => d.value > 0);
  }, [totals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Mois</div>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-input/60 border border-border rounded-md px-3 py-2 text-sm"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Année</div>
          <NumberInput value={year} onChange={setYear} className="w-28" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenus (réel)"
          value={fmtCFA(totals.rev.reel)}
          sub={<Trend current={totals.rev.reel} previous={prevTotals?.revR ?? null} label="Revenus" />}
          tone="success"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Dépenses totales"
          value={fmtCFA(totals.depR)}
          sub={<Trend current={totals.depR} previous={prevTotals?.depR ?? null} label="Dépenses" />}
          tone="destructive"
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          label="Solde net"
          value={fmtCFA(totals.soldeR)}
          sub={<Trend current={totals.soldeR} previous={prevTotals?.soldeR ?? null} label="Solde" />}
          tone={totals.soldeR >= 0 ? "success" : "destructive"}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard label="Taux d'épargne" value={pct(totals.txEpargneR)} sub={`Essentielles : ${pct(totals.ratioEssR)}`} tone="primary" icon={<PiggyBank className="h-5 w-5" />} />
      </div>

      {/* Graphique + objectifs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DoughnutCard data={pieData} />

        <Panel title={<span className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Objectifs d'épargne</span>} className="lg:col-span-2">
          <div className="space-y-4">
            {lines.filter(l => l.category === "epargne").map((l) => {
              const goal = goals[l.id] ?? 0;
              const progress = goal > 0 ? Math.min(100, (l.reel / goal) * 100) : 0;
              return (
                <div key={l.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span>{l.emoji}</span>{l.label}</span>
                    <span className="text-xs text-muted-foreground">{fmtCFA(l.reel)} / {fmtCFA(goal)}</span>
                  </div>
                  <ProgressBar value={progress} tone={progress >= 100 ? "success" : progress >= 50 ? "primary" : "warning"} />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Objectif :</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={goal}
                      onChange={(e) => setGoals({ ...goals, [l.id]: Number(e.target.value || 0) })}
                      className="w-28 bg-input/60 border border-border rounded-md px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {cats.map((cat) => {
        const meta = CATEGORY_META[cat];
        const rows = lines.filter(l => l.category === cat);
        const tB = rows.reduce((s, l) => s + l.budget, 0);
        const tR = rows.reduce((s, l) => s + l.reel, 0);
        const ec = tR - tB;
        return (
          <Panel
            key={cat}
            title={<span><span className="mr-2">{meta.emoji}</span><span className={meta.tone}>{meta.label}</span></span>}
            action={
              <div className="text-xs text-muted-foreground">
                Total : <span className="text-foreground font-semibold">{fmtCFA(tR)}</span> / {fmtCFA(tB)}
                <span className={`ml-3 font-semibold ${ec > 0 ? "text-destructive" : ec < 0 ? "text-[color:var(--success)]" : ""}`}>
                  Écart : {ec > 0 ? "+" : ""}{fmtCFA(ec)}
                </span>
              </div>
            }
          >
            {/* Mobile : cartes */}
            <div className="md:hidden space-y-3">
              {rows.map((l) => {
                const e = l.reel - l.budget;
                return (
                  <div key={l.id} className="rounded-xl border border-border p-3" style={{ background: "var(--gradient-card)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <TextInput value={l.emoji} onChange={(v) => upd(l.id, { emoji: v })} className="w-10 text-center !px-1 shrink-0" />
                      <TextInput value={l.label} onChange={(v) => upd(l.id, { label: v })} />
                      <button onClick={() => delLine(l.id)} title="Supprimer" className="grid place-items-center h-8 w-8 shrink-0 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-muted-foreground">
                        Budget
                        <NumberInput value={l.budget} onChange={(v) => upd(l.id, { budget: v })} className="mt-1" />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        Réel
                        <NumberInput value={l.reel} onChange={(v) => upd(l.id, { reel: v })} className="mt-1" />
                      </label>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-muted-foreground">Écart</span>
                      <span className={`font-semibold tabular-nums ${e > 0 ? "text-destructive" : e < 0 ? "text-[color:var(--success)]" : "text-muted-foreground"}`}>
                        {e > 0 ? "+" : ""}{fmtCFA(e)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <TextInput value={l.notes || ""} onChange={(v) => upd(l.id, { notes: v })} placeholder="Notes…" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop : tableau */}
            <div className="hidden md:block overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-medium py-2 w-12">Icône</th>
                    <th className="text-left font-medium py-2">Poste</th>
                    <th className="text-right font-medium py-2 w-32">Budget</th>
                    <th className="text-right font-medium py-2 w-32">Réel</th>
                    <th className="text-right font-medium py-2 w-32">Écart</th>
                    <th className="text-left font-medium py-2 pl-3">Notes</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const e = l.reel - l.budget;
                    return (
                      <tr key={l.id} className="border-t border-border">
                        <td className="py-2 pr-1">
                          <TextInput value={l.emoji} onChange={(v) => upd(l.id, { emoji: v })} className="text-center !px-1" />
                        </td>
                        <td className="py-2 pr-3">
                          <TextInput value={l.label} onChange={(v) => upd(l.id, { label: v })} />
                        </td>
                        <td className="py-2 px-1"><NumberInput value={l.budget} onChange={(v) => upd(l.id, { budget: v })} /></td>
                        <td className="py-2 px-1"><NumberInput value={l.reel} onChange={(v) => upd(l.id, { reel: v })} /></td>
                        <td className={`py-2 px-2 text-right font-medium tabular-nums ${e > 0 ? "text-destructive" : e < 0 ? "text-[color:var(--success)]" : "text-muted-foreground"}`}>
                          {e > 0 ? "+" : ""}{fmtCFA(e)}
                        </td>
                        <td className="py-2 pl-3">
                          <TextInput value={l.notes || ""} onChange={(v) => upd(l.id, { notes: v })} placeholder="…" />
                        </td>
                        <td className="py-2 pl-2">
                          <button onClick={() => delLine(l.id)} title="Supprimer" className="grid place-items-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <button onClick={() => addLine(cat)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/15 text-primary border border-primary/30 text-xs hover:bg-primary/25 transition">
                <Plus className="h-3.5 w-3.5" />Ajouter une ligne
              </button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

import { useMemo } from "react";
import { CATEGORY_META, DEFAULT_FINANCE_LINES, MONTHS, type FinanceCategory, type FinanceLine } from "@/lib/mind-data";
import { useLocalStorage, fmtCFA, pct } from "@/lib/storage";
import { Panel, NumberInput, TextInput, StatCard } from "./ui";
import { Wallet, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";

export function FinancesView() {
  const today = new Date();
  const [year, setYear] = useLocalStorage("mt.fin.year", today.getFullYear());
  const [month, setMonth] = useLocalStorage("mt.fin.month", today.getMonth());
  const [lines, setLines] = useLocalStorage<FinanceLine[]>(
    `mt.fin.lines.${year}-${month}`, DEFAULT_FINANCE_LINES
  );

  const upd = (id: string, patch: Partial<FinanceLine>) =>
    setLines(lines.map((l) => l.id === id ? { ...l, ...patch } : l));

  const totals = useMemo(() => {
    const t = (cat: FinanceCategory, k: "budget"|"reel") =>
      lines.filter(l => l.category === cat).reduce((s,l) => s + (l[k]||0), 0);
    const rev = { budget: t("revenus","budget"), reel: t("revenus","reel") };
    const ess = { budget: t("essentiel","budget"), reel: t("essentiel","reel") };
    const inv = { budget: t("investissement","budget"), reel: t("investissement","reel") };
    const epa = { budget: t("epargne","budget"), reel: t("epargne","reel") };
    const depB = ess.budget + inv.budget + epa.budget;
    const depR = ess.reel + inv.reel + epa.reel;
    return {
      rev, ess, inv, epa,
      depB, depR,
      soldeB: rev.budget - depB, soldeR: rev.reel - depR,
      txEpargneR: rev.reel ? epa.reel/rev.reel : 0,
      ratioEssR: rev.reel ? ess.reel/rev.reel : 0,
    };
  }, [lines]);

  const cats: FinanceCategory[] = ["revenus","essentiel","investissement","epargne"];

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
            {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Année</div>
          <NumberInput value={year} onChange={setYear} className="w-28" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenus (réel)" value={fmtCFA(totals.rev.reel)} sub={`Budget : ${fmtCFA(totals.rev.budget)}`} tone="success" icon={<TrendingUp className="h-5 w-5"/>} />
        <StatCard label="Dépenses totales" value={fmtCFA(totals.depR)} sub={`Budget : ${fmtCFA(totals.depB)}`} tone="destructive" icon={<TrendingDown className="h-5 w-5"/>} />
        <StatCard label="Solde net" value={fmtCFA(totals.soldeR)} sub={totals.soldeR >= 0 ? "Excédent" : "Déficit"} tone={totals.soldeR >= 0 ? "success" : "destructive"} icon={<Wallet className="h-5 w-5"/>} />
        <StatCard label="Taux d'épargne" value={pct(totals.txEpargneR)} sub={`Essentielles : ${pct(totals.ratioEssR)}`} tone="primary" icon={<PiggyBank className="h-5 w-5"/>} />
      </div>

      {cats.map((cat) => {
        const meta = CATEGORY_META[cat];
        const rows = lines.filter(l => l.category === cat);
        const tB = rows.reduce((s,l)=>s+l.budget,0);
        const tR = rows.reduce((s,l)=>s+l.reel,0);
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
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-medium py-2">Catégorie / Poste</th>
                    <th className="text-right font-medium py-2 w-32">Budget</th>
                    <th className="text-right font-medium py-2 w-32">Réel</th>
                    <th className="text-right font-medium py-2 w-32">Écart</th>
                    <th className="text-left font-medium py-2 pl-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const e = l.reel - l.budget;
                    return (
                      <tr key={l.id} className="border-t border-border">
                        <td className="py-2 pr-3">
                          <span className="mr-2">{l.emoji}</span>{l.label}
                        </td>
                        <td className="py-2 px-1"><NumberInput value={l.budget} onChange={(v) => upd(l.id, { budget: v })} /></td>
                        <td className="py-2 px-1"><NumberInput value={l.reel} onChange={(v) => upd(l.id, { reel: v })} /></td>
                        <td className={`py-2 px-2 text-right font-medium tabular-nums ${e > 0 ? "text-destructive" : e < 0 ? "text-[color:var(--success)]" : "text-muted-foreground"}`}>
                          {e > 0 ? "+" : ""}{fmtCFA(e)}
                        </td>
                        <td className="py-2 pl-3">
                          <TextInput value={l.notes || ""} onChange={(v) => upd(l.id, { notes: v })} placeholder="…" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
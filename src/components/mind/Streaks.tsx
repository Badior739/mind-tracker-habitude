import { useMemo } from "react";
import { Panel } from "./ui";
import { computeBadges, computeStreak } from "@/lib/streaks";
import { Flame, Trophy } from "lucide-react";

export function StreaksPanel() {
  const s = useMemo(() => computeStreak(8), []);
  const badges = useMemo(() => computeBadges(s), [s]);
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Flame className="h-4 w-4 text-[color:var(--warning)]"/>Streaks & badges</span>}>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-border p-3 text-center" style={{ background: "var(--gradient-card)" }}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Actuel</div>
          <div className="text-2xl font-semibold text-[color:var(--warning)] mt-1">{s.current}<span className="text-xs text-muted-foreground"> j</span></div>
        </div>
        <div className="rounded-xl border border-border p-3 text-center" style={{ background: "var(--gradient-card)" }}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Record</div>
          <div className="text-2xl font-semibold text-primary mt-1">{s.best}<span className="text-xs text-muted-foreground"> j</span></div>
        </div>
        <div className="rounded-xl border border-border p-3 text-center" style={{ background: "var(--gradient-card)" }}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Parfaits</div>
          <div className="text-2xl font-semibold text-accent mt-1">{s.perfect}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {badges.map((b) => (
          <div key={b.id} title={b.hint}
            className={`rounded-lg border p-2 text-center transition ${b.unlocked ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/30 opacity-50"}`}>
            <div className="text-2xl">{b.emoji}</div>
            <div className="text-[10px] mt-1 text-muted-foreground leading-tight">{b.label}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 inline-flex items-center gap-1">
        <Trophy className="h-3 w-3"/>Maintenez un score ≥ 8/11 chaque jour pour étendre votre série.
      </p>
    </Panel>
  );
}
import { useMemo } from "react";
import { ACTIVITIES, MONTHS, daysInMonth, dayLabel, type DayEntry } from "@/lib/mind-data";
import { useLocalStorage } from "@/lib/storage";
import { Panel, TextInput, Toggle, ProgressBar } from "./ui";
import { ChevronLeft, ChevronRight, Flame, Trophy, CalendarDays } from "lucide-react";

type MonthData = Record<number, DayEntry>;

function getScoreColor(score: number, max: number) {
  const p = (score / max) * 100;
  if (p >= 80) return "bg-[color:var(--success)]/70";
  if (p >= 60) return "bg-primary/60";
  if (p >= 40) return "bg-[color:var(--warning)]/60";
  return "bg-destructive/50";
}

function getScoreTextColor(score: number, max: number) {
  const p = (score / max) * 100;
  if (p >= 80) return "text-[color:var(--success)]";
  if (p >= 60) return "text-primary";
  if (p >= 40) return "text-[color:var(--warning)]";
  return "text-destructive";
}

export function ActivitiesView() {
  const today = new Date();
  const [year, setYear] = useLocalStorage("mt.act.year", today.getFullYear());
  const [month, setMonth] = useLocalStorage("mt.act.month", today.getMonth());
  const key = `mt.act.${year}-${month}`;
  const [data, setData] = useLocalStorage<MonthData>(key, {});

  const dim = daysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: dim }, (_, i) => i + 1), [dim]);

  const setDay = (d: number, patch: Partial<DayEntry>) =>
    setData({ ...data, [d]: { ...(data[d] || {}), ...patch } });

  const scores = days.map((d) => {
    const e = data[d] || {};
    return ACTIVITIES.reduce((s, a) => s + (e[a.key] ? 1 : 0), 0);
  });
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const possible = dim * ACTIVITIES.length;
  const avg = totalScore / dim;
  const pctAvg = (totalScore / possible) * 100;

  // Streak : jours consécutifs avec score >= 8
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (scores[i] >= 8) streak++;
      else if (scores[i] > 0) break; // jour existant mais score < 8 = coupure
      else if (i < days.length - 1) break; // jour futur, on arrête
    }
    return streak;
  }, [scores, days.length]);

  const bestStreak = useMemo(() => {
    let best = 0, cur = 0;
    for (const s of scores) {
      if (s >= 8) { cur++; best = Math.max(best, cur); }
      else cur = 0;
    }
    return best;
  }, [scores]);

  const bestDay = useMemo(() => {
    let bestScore = -1, bestD = 1;
    days.forEach((d, i) => { if (scores[i] > bestScore) { bestScore = scores[i]; bestD = d; } });
    return { day: bestD, score: bestScore };
  }, [days, scores]);

  const missedDays = useMemo(() => days.filter((d, i) => scores[i] === 0 && i < today.getDate()).length, [days, scores, today]);

  // Stats hebdomadaires
  const weeklyStats = useMemo(() => {
    const weeks: { week: number; avg: number; best: number; total: number }[] = [];
    let w = 1, sum = 0, count = 0, best = 0;
    days.forEach((d, i) => {
      sum += scores[i];
      count++;
      best = Math.max(best, scores[i]);
      if (d % 7 === 0 || d === dim) {
        weeks.push({ week: w, avg: count ? sum / count : 0, best, total: sum });
        w++; sum = 0; count = 0; best = 0;
      }
    });
    return weeks;
  }, [days, scores, dim]);

  const shift = (n: number) => {
    let m = month + n, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  // Calendrier : premier jour du mois
  const firstDayWeekday = new Date(year, month, 1).getDay(); // 0 = dimanche
  const emptyCells = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // Lundi = 1er

  return (
    <div className="space-y-6">
      <Panel
        title={
          <div className="flex items-center gap-3">
            <button onClick={() => shift(-1)} className="grid place-items-center h-8 w-8 rounded-md border border-border hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-base">{MONTHS[month]} {year}</span>
            <button onClick={() => shift(1)} className="grid place-items-center h-8 w-8 rounded-md border border-border hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
          </div>
        }
        action={
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <div>Score moyen : <span className="text-primary font-semibold">{avg.toFixed(2)}/11</span></div>
            <div>Réussite : <span className="text-accent font-semibold">{pctAvg.toFixed(1)}%</span></div>
          </div>
        }
      >
        {/* Calendrier visuel mensuel */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Vue calendrier</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-[11px]">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="text-center text-muted-foreground font-medium py-1">{d}</div>
            ))}
            {Array.from({ length: emptyCells }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square rounded-lg bg-secondary/30" />
            ))}
            {days.map((d) => {
              const score = scores[d - 1];
              const color = getScoreColor(score, ACTIVITIES.length);
              const tc = getScoreTextColor(score, ACTIVITIES.length);
              const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <div
                  key={d}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 cursor-pointer ${color} ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                  title={`${dayLabel(year, month, d)} — ${score}/11`}
                >
                  <span className="text-[10px] font-medium text-foreground/80">{d}</span>
                  <span className={`text-[10px] font-bold ${tc}`}>{score}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats rapides + streak */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-border p-3 flex items-center gap-3" style={{ background: "var(--gradient-card)" }}>
            <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center"><Flame className="h-4 w-4 text-primary" /></div>
            <div>
              <div className="text-lg font-bold leading-none">{currentStreak}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Série actuelle</div>
            </div>
          </div>
          <div className="rounded-xl border border-border p-3 flex items-center gap-3" style={{ background: "var(--gradient-card)" }}>
            <div className="h-9 w-9 rounded-lg bg-accent/10 grid place-items-center"><Trophy className="h-4 w-4 text-accent" /></div>
            <div>
              <div className="text-lg font-bold leading-none">{bestStreak}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Meilleure série</div>
            </div>
          </div>
          <div className="rounded-xl border border-border p-3 flex items-center gap-3" style={{ background: "var(--gradient-card)" }}>
            <div className="h-9 w-9 rounded-lg bg-[color:var(--success)]/10 grid place-items-center"><Trophy className="h-4 w-4 text-[color:var(--success)]" /></div>
            <div>
              <div className="text-lg font-bold leading-none">{bestDay.score}/11</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Meilleur jour ({bestDay.day})</div>
            </div>
          </div>
          <div className="rounded-xl border border-border p-3 flex items-center gap-3" style={{ background: "var(--gradient-card)" }}>
            <div className="h-9 w-9 rounded-lg bg-destructive/10 grid place-items-center"><CalendarDays className="h-4 w-4 text-destructive" /></div>
            <div>
              <div className="text-lg font-bold leading-none">{missedDays}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Jours manqués</div>
            </div>
          </div>
        </div>

        {/* Stats hebdomadaires */}
        {weeklyStats.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-semibold mb-3">📊 Progression hebdomadaire</div>
            <div className="space-y-3">
              {weeklyStats.map((w) => (
                <div key={w.week} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">Semaine {w.week}</span>
                  <div className="flex-1">
                    <ProgressBar
                      value={(w.avg / ACTIVITIES.length) * 100}
                      tone={w.avg >= 8 ? "success" : w.avg >= 5 ? "primary" : w.avg >= 3 ? "warning" : "destructive"}
                    />
                  </div>
                  <span className="text-xs font-medium w-16 text-right">{w.avg.toFixed(1)}/11</span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">max {w.best}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tableau détaillé */}
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr className="text-muted-foreground">
                <th className="sticky left-0 bg-card text-left font-medium py-2 pr-2 min-w-[110px] z-10">📅 Jour</th>
                <th className="font-medium py-2 px-2 min-w-[70px]">⏰ Réveil</th>
                {ACTIVITIES.map((a) => (
                  <th key={a.key} className="font-medium py-2 px-1 text-center min-w-[44px]" title={a.label}>
                    <div className="text-base leading-none">{a.emoji}</div>
                    <div className="text-[10px] mt-1 text-muted-foreground">{a.label.split(" ")[0]}</div>
                  </th>
                ))}
                <th className="font-medium py-2 px-2 text-center">⭐ /11</th>
                <th className="font-medium py-2 px-2 text-center">📊 %</th>
                <th className="font-medium py-2 px-2 min-w-[180px]">📝 Notes</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => {
                const e = data[d] || {};
                const score = scores[i];
                const p = (score / ACTIVITIES.length) * 100;
                return (
                  <tr key={d} className="border-t border-border">
                    <td className="sticky left-0 bg-card py-1.5 pr-2 font-medium text-foreground z-10">
                      {dayLabel(year, month, d)}
                    </td>
                    <td className="py-1.5 px-1">
                      <TextInput value={e.reveil || ""} onChange={(v) => setDay(d, { reveil: v })} placeholder="06:30" className="text-center" />
                    </td>
                    {ACTIVITIES.map((a) => (
                      <td key={a.key} className="py-1.5 px-1 text-center">
                        <div className="flex justify-center">
                          <Toggle on={!!e[a.key]} onChange={(v) => setDay(d, { [a.key]: v } as Partial<DayEntry>)} />
                        </div>
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-center font-semibold text-primary">{score}</td>
                    <td className="py-1.5 px-2 text-center w-[90px]">
                      <div className="text-[11px] text-muted-foreground mb-1">{p.toFixed(0)}%</div>
                      <ProgressBar value={p} tone={p >= 75 ? "success" : p >= 50 ? "primary" : p >= 25 ? "warning" : "destructive"} />
                    </td>
                    <td className="py-1.5 px-1">
                      <TextInput value={e.notes || ""} onChange={(v) => setDay(d, { notes: v })} placeholder="…" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

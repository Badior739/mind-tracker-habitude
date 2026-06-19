import { useEffect, useMemo, useState } from "react";
import { ACTIVITIES, MONTHS, daysInMonth, dayLabel, type DayEntry, type CustomActivity } from "@/lib/mind-data";
import { useLocalStorage } from "@/lib/storage";
import { Panel, TextInput, Toggle, ProgressBar } from "./ui";
import { ChevronLeft, ChevronRight, Flame, Trophy, CalendarDays, Plus, Trash2, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

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
  const [activities, setActivities] = useLocalStorage<CustomActivity[]>(
    "mt.activities",
    ACTIVITIES.map((a) => ({ key: a.key, label: a.label, emoji: a.emoji }))
  );
  const [showConfig, setShowConfig] = useState(false);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const [selectedDay, setSelectedDay] = useState<number | null>(isCurrentMonth ? today.getDate() : null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  // marque "Enregistré automatiquement ✓" à chaque modification
  useEffect(() => {
    setLastSaved(Date.now());
    const t = setTimeout(() => setLastSaved(null), 1800);
    return () => clearTimeout(t);
  }, [data]);
  // Recalc sélection quand on change de mois
  useEffect(() => {
    setSelectedDay(isCurrentMonth ? today.getDate() : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const addActivity = () => {
    const k = `act-${Date.now()}`;
    setActivities([...activities, { key: k, label: "Nouvelle activité", emoji: "✨" }]);
    toast.success("Activité ajoutée", { description: "Personnalise son nom et son emoji." });
  };
  const delActivity = (k: string) => {
    const a = activities.find((x) => x.key === k);
    if (!a) return;
    if (!window.confirm(`Supprimer l'activité « ${a.label} » ?`)) return;
    setActivities(activities.filter(x => x.key !== k));
    toast("Activité supprimée", {
      description: a.label,
      action: { label: "Annuler", onClick: () => setActivities((cur) => [...cur, a]) },
    });
  };
  const updActivity = (k: string, patch: Partial<CustomActivity>) =>
    setActivities(activities.map(a => a.key === k ? { ...a, ...patch } : a));

  const dim = daysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: dim }, (_, i) => i + 1), [dim]);

  const setDay = (d: number, patch: Partial<DayEntry>) =>
    setData({ ...data, [d]: { ...(data[d] || {}), ...patch } });

  const scores = days.map((d) => {
    const e = data[d] || {};
    return activities.reduce((s, a) => s + (e[a.key] ? 1 : 0), 0);
  });
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const maxScore = activities.length || 1;
  const possible = dim * maxScore;
  const avg = totalScore / dim;
  const pctAvg = (totalScore / possible) * 100;

  // Streak : jours consécutifs avec score >= 8
  const streakThreshold = Math.max(1, Math.ceil(maxScore * 0.72));
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (scores[i] >= streakThreshold) streak++;
      else if (scores[i] > 0) break; // jour existant mais score < 8 = coupure
      else if (i < days.length - 1) break; // jour futur, on arrête
    }
    return streak;
  }, [scores, days.length, streakThreshold]);

  const bestStreak = useMemo(() => {
    let best = 0, cur = 0;
    for (const s of scores) {
      if (s >= streakThreshold) { cur++; best = Math.max(best, cur); }
      else cur = 0;
    }
    return best;
  }, [scores, streakThreshold]);

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
        title={<span className="flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-primary" /> Mes activités ({activities.length})</span>}
        action={
          <div className="flex items-center gap-2">
            <button onClick={addActivity} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/15 text-primary border border-primary/30 text-xs hover:bg-primary/25 transition">
              <Plus className="h-3.5 w-3.5" />Ajouter
            </button>
            <button onClick={() => setShowConfig(s => !s)} className="px-3 py-1.5 rounded-md border border-border text-xs hover:bg-secondary transition">
              {showConfig ? "Masquer" : "Configurer"}
            </button>
          </div>
        }
      >
        {showConfig ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activities.map((a) => (
              <div key={a.key} className="flex items-center gap-2 rounded-lg border border-border p-2" style={{ background: "var(--gradient-card)" }}>
                <TextInput value={a.emoji} onChange={(v) => updActivity(a.key, { emoji: v })} className="w-12 text-center !px-1" />
                <TextInput value={a.label} onChange={(v) => updActivity(a.key, { label: v })} />
                <button onClick={() => delActivity(a.key)} className="grid place-items-center h-8 w-8 shrink-0 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activities.map((a) => (
              <span key={a.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs">
                <span>{a.emoji}</span>{a.label}
              </span>
            ))}
          </div>
        )}
      </Panel>

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
            <div>Score moyen : <span className="text-primary font-semibold">{avg.toFixed(2)}/{maxScore}</span></div>
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
              const color = getScoreColor(score, maxScore);
              const tc = getScoreTextColor(score, maxScore);
              const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = d === selectedDay;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 cursor-pointer ${color} ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""} ${isSelected ? "outline outline-2 outline-accent scale-105" : ""}`}
                  title={`${dayLabel(year, month, d)} — ${score}/${maxScore}`}
                >
                  <span className="text-[10px] font-medium text-foreground/80">{d}</span>
                  <span className={`text-[10px] font-bold ${tc}`}>{score}</span>
                </button>
              );
            })}
          </div>

          {/* Détail du jour sélectionné */}
          {selectedDay && (() => {
            const d = selectedDay;
            const e = data[d] || {};
            const score = scores[d - 1];
            const p = (score / maxScore) * 100;
            const isToday = d === today.getDate() && isCurrentMonth;
            return (
              <div className="mt-4 rounded-xl border border-accent/40 p-4" style={{ background: "var(--gradient-card)" }}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{dayLabel(year, month, d)}</span>
                    {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">Aujourd'hui</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${getScoreTextColor(score, maxScore)}`}>{score}/{maxScore}</span>
                    <span className="text-[10px] text-muted-foreground">{p.toFixed(0)}%</span>
                    <button onClick={() => setSelectedDay(null)} className="ml-2 text-[11px] text-muted-foreground hover:text-foreground">✕</button>
                  </div>
                </div>
                <ProgressBar value={p} tone={p >= 75 ? "success" : p >= 50 ? "primary" : p >= 25 ? "warning" : "destructive"} />
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted-foreground">
                    ⏰ Réveil
                    <TextInput value={e.reveil || ""} onChange={(v) => setDay(d, { reveil: v })} placeholder="06:30" className="mt-1" />
                  </label>
                  <label className="text-[11px] text-muted-foreground">
                    📝 Notes
                    <TextInput value={e.notes || ""} onChange={(v) => setDay(d, { notes: v })} placeholder="…" className="mt-1" />
                  </label>
                </div>
                <div className="mt-3">
                  <div className="text-[11px] text-muted-foreground mb-1.5">Activités</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {activities.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => setDay(d, { [a.key]: !e[a.key] } as Partial<DayEntry>)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs transition ${
                          e[a.key]
                            ? "bg-primary/15 border-primary/50 text-primary"
                            : "border-border text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="text-sm">{a.emoji}</span>
                        <span className="truncate flex-1 text-left">{a.label}</span>
                        {e[a.key] && <span className="text-primary">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                    {lastSaved ? (
                      <span className="text-[color:var(--success)]">✓ Enregistré automatiquement</span>
                    ) : (
                      <span>💾 Modifications sauvegardées en direct</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setData({ ...data }); toast.success("Journée enregistrée", { description: dayLabel(year, month, d) }); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/15 text-primary border border-primary/30 text-xs hover:bg-primary/25 transition"
                  >
                    💾 Enregistrer
                  </button>
                </div>
              </div>
            );
          })()}
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
              <div className="text-lg font-bold leading-none">{bestDay.score}/{maxScore}</div>
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
                      value={(w.avg / maxScore) * 100}
                      tone={w.avg >= streakThreshold ? "success" : w.avg >= maxScore * 0.45 ? "primary" : w.avg >= maxScore * 0.25 ? "warning" : "destructive"}
                    />
                  </div>
                  <span className="text-xs font-medium w-16 text-right">{w.avg.toFixed(1)}/{maxScore}</span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">max {w.best}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!selectedDay && (
          <div className="text-center text-xs text-muted-foreground py-4 border border-dashed border-border rounded-xl">
            👆 Cliquez sur une date du calendrier pour voir et renseigner les activités de ce jour.
          </div>
        )}
      </Panel>
    </div>
  );
}

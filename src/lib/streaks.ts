import { ACTIVITIES, daysInMonth, type DayEntry } from "./mind-data";

function readAct(y: number, m: number): Record<number, DayEntry> {
  try { return JSON.parse(localStorage.getItem(`mt.act.${y}-${m}`) || "{}"); }
  catch { return {}; }
}

function scoreOf(e: DayEntry) {
  return ACTIVITIES.reduce((s, a) => s + (e[a.key] ? 1 : 0), 0);
}

/** Streak actuel : jours consécutifs jusqu'à aujourd'hui avec score >= threshold. */
export function computeStreak(threshold = 8) {
  if (typeof window === "undefined") return { current: 0, best: 0, totalDays: 0, perfect: 0 };
  const today = new Date();
  let current = 0;
  // chercher en remontant à partir d'aujourd'hui
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Si aujourd'hui pas encore validé, on commence à hier pour le current
  while (true) {
    const y = d.getFullYear(); const m = d.getMonth(); const dd = d.getDate();
    const e = readAct(y, m)[dd] || {};
    if (scoreOf(e) >= threshold) {
      current++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
    if (current > 365) break;
  }

  // Best & total sur 12 derniers mois
  let best = 0, run = 0, totalDays = 0, perfect = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  while (cursor <= today) {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const dim = daysInMonth(y, m);
    const month = readAct(y, m);
    for (let dd = 1; dd <= dim; dd++) {
      const day = new Date(y, m, dd);
      if (day > today) break;
      const s = scoreOf(month[dd] || {});
      if (s > 0) totalDays++;
      if (s === ACTIVITIES.length) perfect++;
      if (s >= threshold) { run++; best = Math.max(best, run); }
      else run = 0;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return { current, best, totalDays, perfect };
}

export type Badge = { id: string; emoji: string; label: string; unlocked: boolean; hint: string };

export function computeBadges(s: ReturnType<typeof computeStreak>): Badge[] {
  return [
    { id: "streak-3",  emoji: "🔥",   label: "3 jours",     hint: "3 jours consécutifs ≥ 8/11", unlocked: s.best >= 3 },
    { id: "streak-7",  emoji: "⚡",   label: "1 semaine",   hint: "7 jours consécutifs ≥ 8/11", unlocked: s.best >= 7 },
    { id: "streak-14", emoji: "🌟",   label: "2 semaines",  hint: "14 jours consécutifs ≥ 8/11", unlocked: s.best >= 14 },
    { id: "streak-30", emoji: "🏆",   label: "30 jours",    hint: "30 jours consécutifs ≥ 8/11", unlocked: s.best >= 30 },
    { id: "perfect-1", emoji: "💎",   label: "Journée parfaite", hint: "Un jour à 11/11", unlocked: s.perfect >= 1 },
    { id: "perfect-5", emoji: "👑",   label: "5 jours parfaits", hint: "5 jours à 11/11", unlocked: s.perfect >= 5 },
    { id: "consist",   emoji: "📚",   label: "Régularité",  hint: "30 jours d'activité enregistrés", unlocked: s.totalDays >= 30 },
    { id: "century",   emoji: "🚀",   label: "100 jours",   hint: "100 jours d'activité enregistrés", unlocked: s.totalDays >= 100 },
  ];
}
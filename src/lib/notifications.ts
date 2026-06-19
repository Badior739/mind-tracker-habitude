import type { NotifPrefs } from "./prefs";

export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function canNotify() {
  return typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted";
}

export function notify(title: string, body: string, tag?: string) {
  // Fallback toast pour les environnements sans Notification API (iOS Safari hors PWA, etc.)
  const fallback = () => {
    try {
      // import dynamique pour éviter un cycle avec sonner côté SSR
      import("sonner").then(({ toast }) => toast(title, { description: body }));
    } catch {}
  };
  if (!canNotify()) { fallback(); return; }
  try {
    // Service worker requis pour mobile Android/Chrome — fallback sinon
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.showNotification(title, { body, tag, icon: "/icon-512.png", badge: "/icon-512.png" })
      ).catch(() => { new Notification(title, { body, tag }); });
    } else {
      new Notification(title, { body, tag, icon: "/icon-512.png", badge: "/icon-512.png" });
    }
  } catch {
    fallback();
  }
}

// --- Throttle helpers (pour éviter le spam) ---
const SEEN_KEY = "mt.notif.seen";
function getSeen(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); }
  catch { return {}; }
}
function setSeen(o: Record<string, number>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(o));
}
function markFiredOnce(key: string, windowMs: number) {
  const seen = getSeen();
  const last = seen[key] || 0;
  if (Date.now() - last < windowMs) return false;
  seen[key] = Date.now();
  setSeen(seen);
  return true;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// --- Lecture data sans dépendre des hooks ---
import { ACTIVITIES, daysInMonth, type DayEntry, type FinanceLine } from "./mind-data";

function readActMonth(y: number, m: number): Record<number, DayEntry> {
  try { return JSON.parse(localStorage.getItem(`mt.act.${y}-${m}`) || "{}"); }
  catch { return {}; }
}
function readFinMonth(y: number, m: number): FinanceLine[] {
  try { return JSON.parse(localStorage.getItem(`mt.fin.lines.${y}-${m}`) || "[]"); }
  catch { return []; }
}

/** Vérifie et déclenche les notifications dues. Appelé périodiquement. */
export function runNotificationChecks(prefs: NotifPrefs) {
  if (!prefs.enabled || !canNotify()) return;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  // 1. Rappel activités (quotidien ou hebdo le dimanche)
  if (prefs.activitiesEnabled) {
    const [hh, mm] = (prefs.activitiesTime || "21:00").split(":").map(Number);
    const todayMin = now.getHours() * 60 + now.getMinutes();
    const targetMin = (hh || 21) * 60 + (mm || 0);
    const dueByFreq = prefs.activitiesFrequency === "weekly" ? now.getDay() === 0 : true;
    if (dueByFreq && todayMin >= targetMin) {
      const data = readActMonth(y, m)[d] || {};
      const score = ACTIVITIES.reduce((s, a) => s + (data[a.key] ? 1 : 0), 0);
      if (score < ACTIVITIES.length) {
        const tag = prefs.activitiesFrequency === "weekly" ? `weekly-act:${y}-${weekNum(now)}` : `daily-act:${todayKey()}`;
        if (markFiredOnce(tag, 12 * 60 * 60_000)) {
          notify(
            "Rappel Activités",
            `Pensez à cocher vos activités (${score}/${ACTIVITIES.length}).`,
            "mt-daily"
          );
        }
      }
    }
  }

  // 2. Rappel finances (quotidien ou hebdo)
  if (prefs.financesEnabled) {
    const [hh, mm] = (prefs.financesTime || "19:00").split(":").map(Number);
    const todayMin = now.getHours() * 60 + now.getMinutes();
    const targetMin = (hh || 19) * 60 + (mm || 0);
    const dueByFreq = prefs.financesFrequency === "weekly" ? now.getDay() === 0 : true;
    if (dueByFreq && todayMin >= targetMin) {
      const tag = prefs.financesFrequency === "weekly" ? `weekly-fin:${y}-${weekNum(now)}` : `daily-fin:${todayKey()}`;
      if (markFiredOnce(tag, 12 * 60 * 60_000)) {
        notify(
          prefs.financesFrequency === "weekly" ? "Bilan financier hebdo" : "Point finances du jour",
          "C'est le moment de faire le point sur vos finances.",
          "mt-weekly"
        );
      }
    }
  }

  // 3. Alertes dépassement budget
  if (prefs.budgetAlerts) {
    const lines = readFinMonth(y, m);
    for (const l of lines) {
      if (l.category === "revenus") continue;
      if (l.budget > 0 && l.reel > l.budget) {
        const key = `over:${y}-${m}:${l.id}:${Math.floor(l.reel / Math.max(1, l.budget) * 10)}`;
        if (markFiredOnce(key, 24 * 60 * 60_000)) {
          notify(
            "Dépassement budget",
            `${l.label} : ${Math.round(l.reel)} F dépasse le budget (${Math.round(l.budget)} F).`,
            "mt-budget-" + l.id
          );
        }
      }
    }
  }

  // 4. Félicitations score élevé
  if (prefs.scoreCongrats) {
    const data = readActMonth(y, m)[d] || {};
    const score = ACTIVITIES.reduce((s, a) => s + (data[a.key] ? 1 : 0), 0);
    if (score >= 9) {
      if (markFiredOnce(`high:${todayKey()}`, 24 * 60 * 60_000)) {
        notify(
          `Excellent — ${score}/11 ${score === 11 ? "🔥" : "💪"}`,
          "Vous tenez votre discipline aujourd'hui. Continuez !",
          "mt-high"
        );
      }
    }
  }

  // Nettoyage (les clés > 30 j)
  const seen = getSeen();
  const cutoff = Date.now() - 30 * 24 * 60 * 60_000;
  for (const k of Object.keys(seen)) if (seen[k] < cutoff) delete seen[k];
  setSeen(seen);

  // Mois utilisé pour éviter l'avert. TS sur paramètre non lu
  void daysInMonth;
}

function weekNum(d: Date) {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d.getTime() - start.getTime()) / 86400000;
  return Math.floor((diff + start.getDay() + 1) / 7);
}
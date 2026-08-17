import type { NotifPrefs } from "./prefs";
import { ACTIVITIES, daysInMonth, type DayEntry, type FinanceLine } from "./mind-data";
import { disablePushSubscription, getPushPublicKey, savePushSubscription, sendTestPush } from "./push.functions";

export type NotificationStatus = {
  supported: boolean;
  permission: NotificationPermission;
  secureContext: boolean;
  inIframe: boolean;
  serviceWorker: boolean;
  standalone: boolean;
  isIOS: boolean;
  canUseSystem: boolean;
  message: string;
};

export type NotifyResult = {
  ok: boolean;
  channel: "system" | "toast" | "none";
  reason: string;
};

let notificationWorkerPromise: Promise<ServiceWorkerRegistration | null> | null = null;
const INSTALLATION_ID_KEY = "mt.push.installation.id";
const INSTALLATION_SECRET_KEY = "mt.push.installation.secret";

type InstallationCredentials = { installationId: string; installationSecret: string };

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function getInstallationCredentials(): InstallationCredentials {
  let installationId = localStorage.getItem(INSTALLATION_ID_KEY);
  let installationSecret = localStorage.getItem(INSTALLATION_SECRET_KEY);
  if (!installationId) {
    installationId = crypto.randomUUID();
    localStorage.setItem(INSTALLATION_ID_KEY, installationId);
  }
  if (!installationSecret) {
    installationSecret = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    localStorage.setItem(INSTALLATION_SECRET_KEY, installationSecret);
  }
  return { installationId, installationSecret };
}

export function getNotificationStatus(): NotificationStatus {
  if (typeof window === "undefined") {
    return {
      supported: false,
      permission: "denied",
      secureContext: false,
      inIframe: false,
      serviceWorker: false,
      standalone: false,
      isIOS: false,
      canUseSystem: false,
      message: "Notifications indisponibles pendant le chargement.",
    };
  }

  const supported = "Notification" in window;
  const permission = supported ? Notification.permission : "denied";
  const nav = window.navigator;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((nav as Navigator & { standalone?: boolean }).standalone);
  const isIOS = /iPad|iPhone|iPod/.test(nav.userAgent) ||
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  const secureContext = window.isSecureContext;
  const inIframe = window.self !== window.top;
  const serviceWorker = "serviceWorker" in nav;

  let message = "Prêt à demander l'autorisation.";
  if (!supported) message = "Ce navigateur ne supporte pas les notifications web.";
  else if (!secureContext) message = "Les notifications exigent une adresse sécurisée HTTPS.";
  else if (inIframe) message = "L'aperçu intégré peut bloquer la demande : ouvrez l'app dans un onglet complet.";
  else if (isIOS && !standalone) message = "Sur iPhone, installez l'app sur l'écran d'accueil pour recevoir les notifications.";
  else if (permission === "denied") message = "Les notifications sont bloquées dans les réglages du site.";
  else if (permission === "granted") message = "Notifications autorisées.";

  return {
    supported,
    permission,
    secureContext,
    inIframe,
    serviceWorker,
    standalone,
    isIOS,
    canUseSystem: supported && secureContext && permission === "granted",
    message,
  };
}

export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window) || !window.isSecureContext) return "denied";
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
    window.isSecureContext &&
    Notification.permission === "granted";
}

export async function ensureNotificationWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !window.isSecureContext) {
    return null;
  }
  if (!notificationWorkerPromise) {
    notificationWorkerPromise = navigator.serviceWorker
      .getRegistration("/notifications/")
      .then((existing) => existing ?? navigator.serviceWorker.register("/notifications/sw.js", { scope: "/notifications/" }))
      .catch(() => null);
  }
  return notificationWorkerPromise;
}

export async function hasBackgroundPushSubscription() {
  const registration = await ensureNotificationWorker();
  if (!registration || !("PushManager" in window)) return false;
  return Boolean(await registration.pushManager.getSubscription());
}

export async function syncBackgroundPush(prefs: NotifPrefs) {
  if (typeof window === "undefined" || Notification.permission !== "granted") {
    throw new Error("Autorisez d'abord les notifications sur cet appareil.");
  }
  const registration = await ensureNotificationWorker();
  if (!registration || !("pushManager" in registration)) {
    throw new Error("Les notifications en arrière-plan ne sont pas disponibles sur cet appareil.");
  }
  const credentials = getInstallationCredentials();
  if (!prefs.enabled) {
    await disablePushSubscription({ data: credentials });
    return { active: false };
  }
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const { publicKey } = await getPushPublicKey();
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(publicKey),
    });
  }
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("L'abonnement envoyé par le téléphone est incomplet.");
  }
  await savePushSubscription({
    data: {
      ...credentials,
      subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
      prefs,
    },
  });
  return { active: true };
}

export async function testBackgroundPush(prefs: NotifPrefs) {
  await syncBackgroundPush({ ...prefs, enabled: true });
  await sendTestPush({ data: getInstallationCredentials() });
}

async function fallbackToast(title: string, body: string, reason: string): Promise<NotifyResult> {
  // Fallback toast pour les environnements sans Notification API (iOS Safari hors PWA, etc.)
  try {
    // import dynamique pour éviter un cycle avec sonner côté SSR
    const { toast } = await import("sonner");
    toast(title, { description: body });
    return { ok: false, channel: "toast", reason };
  } catch {
    return { ok: false, channel: "none", reason };
  }
}

export async function notify(title: string, body: string, tag?: string): Promise<NotifyResult> {
  if (typeof window === "undefined") return { ok: false, channel: "none", reason: "Chargement serveur." };
  if (!("Notification" in window)) return fallbackToast(title, body, "Notifications non supportées par ce navigateur.");
  if (!window.isSecureContext) return fallbackToast(title, body, "Adresse HTTPS requise pour les notifications.");
  if (Notification.permission !== "granted") return fallbackToast(title, body, "Permission notification non accordée.");

  const options: NotificationOptions = { body, tag, icon: "/icon-512.png", badge: "/icon-512.png" };
  try {
    const reg = await ensureNotificationWorker();
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
      return { ok: true, channel: "system", reason: "Notification envoyée via le service de notifications." };
    }
  } catch {}

  try {
    new Notification(title, options);
    return { ok: true, channel: "system", reason: "Notification envoyée par le navigateur." };
  } catch {
    return fallbackToast(title, body, "Le navigateur a refusé l'affichage système ; affichage interne utilisé.");
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
  void ensureNotificationWorker();
  const now = zonedNow(prefs.timezone);
  const y = now.year;
  const m = now.month;
  const d = now.day;

  // 1. Rappel activités (quotidien ou hebdo le dimanche)
  if (prefs.activitiesEnabled) {
    const [hh, mm] = (prefs.activitiesTime || "21:00").split(":").map(Number);
    const todayMin = now.hour * 60 + now.minute;
    const targetMin = (hh || 21) * 60 + (mm || 0);
    const dueByFreq = prefs.activitiesFrequency === "weekly" ? now.weekday === 0 : true;
    if (dueByFreq && todayMin >= targetMin) {
      const data = readActMonth(y, m)[d] || {};
      const score = ACTIVITIES.reduce((s, a) => s + (data[a.key] ? 1 : 0), 0);
      if (score < ACTIVITIES.length) {
        const tag = prefs.activitiesFrequency === "weekly" ? `weekly-act:${y}-${weekNum(y, m, d)}` : `daily-act:${todayKeyFromParts(now)}`;
        if (markFiredOnce(tag, 12 * 60 * 60_000)) {
          void notify(
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
    const todayMin = now.hour * 60 + now.minute;
    const targetMin = (hh || 19) * 60 + (mm || 0);
    const dueByFreq = prefs.financesFrequency === "weekly" ? now.weekday === 0 : true;
    if (dueByFreq && todayMin >= targetMin) {
      const tag = prefs.financesFrequency === "weekly" ? `weekly-fin:${y}-${weekNum(y, m, d)}` : `daily-fin:${todayKeyFromParts(now)}`;
      if (markFiredOnce(tag, 12 * 60 * 60_000)) {
        void notify(
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
          void notify(
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
      if (markFiredOnce(`high:${todayKeyFromParts(now)}`, 24 * 60 * 60_000)) {
        void notify(
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

type ZonedNow = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

function zonedNow(timezone?: string): ZonedNow {
  const date = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hour12: false,
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
    const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const hour = Number(get("hour"));
    return {
      year: Number(get("year")),
      month: Number(get("month")) - 1,
      day: Number(get("day")),
      hour: hour === 24 ? 0 : hour,
      minute: Number(get("minute")),
      weekday: weekdays[get("weekday")] ?? date.getDay(),
    };
  } catch {
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      weekday: date.getDay(),
    };
  }
}

function todayKeyFromParts(d: ZonedNow) {
  return `${d.year}-${d.month + 1}-${d.day}`;
}

function weekNum(year: number, month: number, day: number) {
  const current = Date.UTC(year, month, day);
  const start = Date.UTC(year, 0, 1);
  const startDay = new Date(start).getUTCDay();
  const diff = (current - start) / 86400000;
  return Math.floor((diff + startDay + 1) / 7);
}
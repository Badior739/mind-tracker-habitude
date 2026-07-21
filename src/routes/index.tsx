import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell, type TabKey } from "@/components/mind/Shell";
import { DashboardView } from "@/components/mind/Dashboard";
import { ActivitiesView } from "@/components/mind/Activities";
import { AnnualView } from "@/components/mind/Annual";
import { FinancesView } from "@/components/mind/Finances";
import { HistoryView } from "@/components/mind/History";
import { RoadmapView } from "@/components/mind/Roadmap";
import { GuideView } from "@/components/mind/Guide";
import { SettingsView } from "@/components/mind/Settings";
import { PinLock } from "@/components/mind/PinLock";
import { StreaksPanel } from "@/components/mind/Streaks";
import { useLocalStorage } from "@/lib/storage";
import { DEFAULT_APP_PREFS, DEFAULT_NOTIFS, type AppPrefs, type NotifPrefs } from "@/lib/prefs";
import { ensureNotificationWorker, getNotificationStatus, requestNotifPermission, runNotificationChecks } from "@/lib/notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mind Tracker — Tableau de bord personnel & financier" },
      { name: "description", content: "Mind Tracker : suivez vos activités quotidiennes, finances mensuelles et roadmap MGS dans une interface unifiée." },
      { property: "og:title", content: "Mind Tracker" },
      { property: "og:description", content: "Suivi quotidien, finances et roadmap — Mind Graphix Solution." },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [locked, setLocked] = useState(true);
  const [pinMode, setPinMode] = useState<"auto" | "setup">("auto");
  const [app] = useLocalStorage<AppPrefs>("mt.app.v1", DEFAULT_APP_PREFS);
  const [notifs, setNotifs] = useLocalStorage<NotifPrefs>("mt.notifs.v1", DEFAULT_NOTIFS);
  const idleTimer = useRef<number | null>(null);

  // Auto-lock par inactivité
  useEffect(() => {
    if (locked) return;
    const reset = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setLocked(true), app.lockTimeoutMs) as unknown as number;
    };
    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    const onHide = () => { if (document.visibilityState === "hidden") setLocked(true); };
    document.addEventListener("visibilitychange", onHide);
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", onHide);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [locked, app.lockTimeoutMs]);

  // Vérifications notifications périodiques
  useEffect(() => {
    if (locked) return;
    (async () => {
      if (typeof window !== "undefined") {
        const status = getNotificationStatus();
        const promptKey = "mt.notif.permission.prompted.session";

        if (status.permission === "default" && !sessionStorage.getItem(promptKey)) {
          sessionStorage.setItem(promptKey, "1");
          toast("Activer les rappels Mind Tracker ?", {
            description: "Cliquez sur Autoriser pour recevoir les rappels Activités et Finances.",
            action: {
              label: "Autoriser",
              onClick: async () => {
                const p = await requestNotifPermission();
                if (p === "granted") {
                  await ensureNotificationWorker();
                  setNotifs({ ...notifs, enabled: true });
                  toast.success("Notifications autorisées", { description: "Les rappels sont maintenant actifs." });
                } else {
                  toast.error("Notifications non autorisées", { description: "Activez-les dans les réglages du navigateur puis réessayez." });
                }
              },
            },
          });
        }

        if (status.permission === "granted") {
          await ensureNotificationWorker();
        }
      }
      runNotificationChecks(notifs);
    })();
    const id = window.setInterval(() => runNotificationChecks(notifs), 60_000);
    return () => window.clearInterval(id);
  }, [locked, notifs]);

  // Enregistrer le service worker / manifest (PWA légère)
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      const l = document.createElement("link");
      l.rel = "manifest"; l.href = "/manifest.webmanifest";
      document.head.appendChild(l);
    }
  }, []);

  if (locked) {
    return <PinLock mode={pinMode} onUnlock={() => { setLocked(false); setPinMode("auto"); }} />;
  }

  return (
    <Shell tab={tab} onTab={setTab} onLock={() => setLocked(true)}>
      {tab === "dashboard"  && <DashboardView goto={setTab} />}
      {tab === "activities" && <ActivitiesView />}
      {tab === "annual"     && <AnnualView />}
      {tab === "finances"   && <FinancesView />}
      {tab === "history"    && <HistoryView />}
      {tab === "roadmap"    && <RoadmapView />}
      {tab === "guide"      && <GuideView />}
      {tab === "settings"   && <SettingsView onChangePin={() => { setPinMode("setup"); setLocked(true); }} />}
      {tab === "dashboard"  && <div className="mt-6"><StreaksPanel /></div>}
    </Shell>
  );
}

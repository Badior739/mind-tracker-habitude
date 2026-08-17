import { useEffect, useRef, useState } from "react";
import { Panel } from "./ui";
import { useLocalStorage } from "@/lib/storage";
import { DEFAULT_APP_PREFS, DEFAULT_NOTIFS, type AppPrefs, type NotifPrefs } from "@/lib/prefs";
import { ensureNotificationWorker, getNotificationStatus, hasBackgroundPushSubscription, requestNotifPermission, syncBackgroundPush, testBackgroundPush } from "@/lib/notifications";
import { toast } from "sonner";
import { clearPin, pinIsSet } from "@/lib/pin";
import { exportActivitiesCSV, exportFinanceCSV, printToPDF } from "@/lib/export";
import { Bell, CheckCircle2, ExternalLink, Lock, EyeOff, Download, Printer, ShieldCheck, RotateCcw, Upload, Save, RefreshCw, XCircle } from "lucide-react";
import { exportBackup, importBackup } from "@/lib/backup";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`h-6 w-11 rounded-full border transition-colors relative ${on ? "bg-primary border-primary" : "bg-secondary border-border"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function SettingsView({ onChangePin }: { onChangePin: () => void }) {
  const [notifs, setNotifs] = useLocalStorage<NotifPrefs>("mt.notifs.v1", DEFAULT_NOTIFS);
  const [app, setApp] = useLocalStorage<AppPrefs>("mt.app.v1", DEFAULT_APP_PREFS);
  const [status, setStatus] = useState(() => getNotificationStatus());
  const [backgroundPush, setBackgroundPush] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const perm = status.permission;
  const today = new Date();
  const [exYear, setExYear] = useState(today.getFullYear());
  const [exMonth, setExMonth] = useState(today.getMonth());
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("replace");

  useEffect(() => {
    setStatus(getNotificationStatus());
    void hasBackgroundPushSubscription().then(setBackgroundPush).catch(() => setBackgroundPush(false));
  }, [notifs.enabled]);

  useEffect(() => {
    if (!notifs.enabled || Notification.permission !== "granted") return;
    const timer = window.setTimeout(() => {
      void syncBackgroundPush(notifs)
        .then(() => setBackgroundPush(true))
        .catch(() => setBackgroundPush(false));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [notifs]);

  async function toggleEnable(v: boolean) {
    if (v) {
      const p = await requestNotifPermission();
      if (p === "granted") await ensureNotificationWorker();
      setStatus(getNotificationStatus());
      if (p === "granted") {
        const nextPrefs = { ...notifs, enabled: true };
        setNotifs(nextPrefs);
        try {
          await syncBackgroundPush(nextPrefs);
          setBackgroundPush(true);
          toast.success("Rappels en arrière-plan activés", { description: "Ils peuvent arriver même lorsque Mind Tracker est fermé." });
        } catch (error) {
          setBackgroundPush(false);
          toast.error("Abonnement impossible", { description: error instanceof Error ? error.message : "Réessayez dans un instant." });
        }
      } else if (p === "denied") {
        toast.error("Notifications bloquées", { description: "Autorisez-les dans les réglages du navigateur pour ce site." });
      } else {
        toast("Permission refusée", { description: "Réessayez et acceptez la demande du navigateur." });
      }
    } else {
      const nextPrefs = { ...notifs, enabled: false };
      setNotifs(nextPrefs);
      void syncBackgroundPush(nextPrefs).finally(() => setBackgroundPush(false));
    }
  }

  return (
    <div className="space-y-6">
      <Panel title={<span className="inline-flex items-center gap-2"><Lock className="h-4 w-4 text-primary"/>Sécurité — Code PIN</span>}>
        <Row label="Code PIN défini" hint={pinIsSet() ? "Votre PIN protège l'accès à l'application." : "Aucun PIN défini pour le moment."}>
          <span className={`text-xs font-medium ${pinIsSet() ? "text-[color:var(--success)]" : "text-muted-foreground"}`}>
            {pinIsSet() ? "✓ Actif" : "Non défini"}
          </span>
        </Row>
        <Row label="Verrouillage automatique" hint="Durée d'inactivité avant verrouillage">
          <select value={app.lockTimeoutMs} onChange={(e) => setApp({ ...app, lockTimeoutMs: Number(e.target.value) })}
            className="bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm">
            <option value={30_000}>30 s</option>
            <option value={60_000}>1 min</option>
            <option value={120_000}>2 min</option>
            <option value={300_000}>5 min</option>
          </select>
        </Row>
        <div className="flex flex-wrap gap-2 pt-3">
          <button onClick={onChangePin} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-secondary">
            <RotateCcw className="h-4 w-4"/>Changer le PIN
          </button>
          <button onClick={() => { if (confirm("Supprimer le code PIN ?")) clearPin(); }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10">
            <ShieldCheck className="h-4 w-4"/>Supprimer le PIN
          </button>
        </div>
      </Panel>

      <Panel title={<span className="inline-flex items-center gap-2"><Bell className="h-4 w-4 text-accent"/>Notifications & rappels</span>}>
        <div className={`mb-3 p-3 rounded-md border text-xs ${
          status.canUseSystem
            ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]"
            : "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
        }`}>
          <div className="flex items-start gap-2">
            {status.canUseSystem ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            <div>
              <div className="font-medium">Diagnostic : {status.message}</div>
              <div className="mt-1 text-muted-foreground">
                Autorisation : {perm === "granted" ? "accordée" : perm === "denied" ? "bloquée" : "pas encore demandée"} · App installée : {status.standalone ? "oui" : "non"} · Arrière-plan : {backgroundPush ? "actif" : "inactif"}
              </div>
            </div>
          </div>
        </div>
        {perm === "denied" && (
          <div className="mb-3 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-xs">
            Les notifications sont bloquées par le navigateur. Autorisez-les dans les réglages du site pour activer les rappels.
          </div>
        )}
        <Row label="Activer les notifications" hint="Autorise l'envoi de rappels depuis Mind Tracker">
          <Switch on={notifs.enabled && perm === "granted"} onChange={toggleEnable} />
        </Row>

        <div className="mt-4 mb-1 text-xs font-semibold text-primary uppercase tracking-wide">🎯 Activités</div>
        <Row label="Rappel pour les activités" hint="Si toutes les activités ne sont pas cochées">
          <Switch on={!!notifs.activitiesEnabled} onChange={(v) => setNotifs({ ...notifs, activitiesEnabled: v })} />
        </Row>
        <Row label="Fréquence">
          <select value={notifs.activitiesFrequency}
            onChange={(e) => setNotifs({ ...notifs, activitiesFrequency: e.target.value as "daily" | "weekly" })}
            className="bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm">
            <option value="daily">Quotidien</option>
            <option value="weekly">Hebdomadaire (dimanche)</option>
          </select>
        </Row>
        <Row label="Heure du rappel">
          <input type="time" value={notifs.activitiesTime}
            onChange={(e) => setNotifs({ ...notifs, activitiesTime: e.target.value })}
            className="bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm" />
        </Row>

        <div className="mt-4 mb-1 text-xs font-semibold text-accent uppercase tracking-wide">💰 Finances</div>
        <Row label="Rappel financier" hint="Bilan / vérification des dépenses">
          <Switch on={!!notifs.financesEnabled} onChange={(v) => setNotifs({ ...notifs, financesEnabled: v })} />
        </Row>
        <Row label="Fréquence">
          <select value={notifs.financesFrequency}
            onChange={(e) => setNotifs({ ...notifs, financesFrequency: e.target.value as "daily" | "weekly" })}
            className="bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm">
            <option value="daily">Quotidien</option>
            <option value="weekly">Hebdomadaire (dimanche)</option>
          </select>
        </Row>
        <Row label="Heure du rappel">
          <input type="time" value={notifs.financesTime}
            onChange={(e) => setNotifs({ ...notifs, financesTime: e.target.value })}
            className="bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm" />
        </Row>

        <div className="mt-4 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">🌍 Fuseau horaire</div>
        <Row label="Fuseau" hint={`Détecté : ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}>
          <select value={notifs.timezone}
            onChange={(e) => setNotifs({ ...notifs, timezone: e.target.value })}
            className="bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm max-w-[200px]">
            {[
              "Africa/Abidjan","Africa/Dakar","Africa/Casablanca","Africa/Algiers","Africa/Tunis",
              "Africa/Lagos","Africa/Douala","Africa/Kinshasa","Africa/Nairobi","Africa/Johannesburg",
              "Europe/Paris","Europe/London","Europe/Madrid","Europe/Rome","Europe/Brussels",
              "America/Montreal","America/New_York","America/Los_Angeles","Asia/Dubai","Asia/Tokyo",
            ].map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </Row>

        <div className="mt-4 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">🔔 Autres</div>
        <Row label="Alertes de dépassement budget" hint="Quand une dépense dépasse le budget prévu">
          <Switch on={notifs.budgetAlerts} onChange={(v) => setNotifs({ ...notifs, budgetAlerts: v })} />
        </Row>
        <Row label="Félicitations score élevé" hint="Notification quand vous atteignez 9/11 ou plus">
          <Switch on={notifs.scoreCongrats} onChange={(v) => setNotifs({ ...notifs, scoreCongrats: v })} />
        </Row>
        <div className="pt-4 flex flex-col gap-2">
          <button disabled={pushBusy} onClick={async () => {
              setPushBusy(true);
              const current = getNotificationStatus();
              const p = current.permission === "granted" ? "granted" : await requestNotifPermission();
              if (p === "granted") await ensureNotificationWorker();
              setStatus(getNotificationStatus());
              if (p === "granted") {
                const nextPrefs = { ...notifs, enabled: true };
                setNotifs(nextPrefs);
                try {
                  await testBackgroundPush(nextPrefs);
                  setBackgroundPush(true);
                  toast.success("Test serveur envoyé", { description: "La réception confirme le fonctionnement même app fermée." });
                } catch (error) {
                  setBackgroundPush(false);
                  toast.error("Test en arrière-plan échoué", { description: error instanceof Error ? error.message : "Réessayez dans un instant." });
                }
              } else if (p === "denied") {
                toast.error("Permission bloquée par le navigateur", {
                  description: "Allez dans les réglages du site pour réactiver les notifications.",
                });
              } else {
                toast("Permission refusée", { description: "Réessayez et acceptez la demande du navigateur." });
              }
              setPushBusy(false);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-60">
            {pushBusy ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Bell className="h-4 w-4"/>}{pushBusy ? "Test en cours…" : "Tester en arrière-plan"}
          </button>
          <div className={`text-xs px-3 py-2 rounded-md border ${
            perm === "granted" ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]"
            : perm === "denied" ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border bg-secondary/30 text-muted-foreground"
          }`}>
            État : {backgroundPush ? "✓ Rappels serveur actifs" : perm === "granted" ? "⚠ Autorisation accordée, abonnement serveur inactif" : perm === "denied" ? "✗ Notifications bloquées" : "⚠ Permission non demandée"}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Astuce : sur Android, ouvrez l'app dans Chrome puis autorisez les notifications du site. Sur iPhone, ajoutez Mind Tracker à l'écran d'accueil avant d'autoriser les rappels.
        </p>
        <button
          type="button"
          onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
          className="mt-2 inline-flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5"/>Ouvrir dans un onglet complet
        </button>
      </Panel>

      <Panel title={<span className="inline-flex items-center gap-2"><EyeOff className="h-4 w-4 text-primary"/>Confidentialité — Mode discret</span>}>
        <Row label="Masquer les montants" hint="Remplace les sommes financières par ••••• F">
          <Switch on={app.discreet} onChange={(v) => setApp({ ...app, discreet: v })} />
        </Row>
      </Panel>

      <Panel title={<span className="inline-flex items-center gap-2"><Download className="h-4 w-4 text-accent"/>Exporter mes données</span>}>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Mois</div>
            <select value={exMonth} onChange={(e) => setExMonth(Number(e.target.value))}
              className="bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm">
              {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"].map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Année</div>
            <input type="number" value={exYear} onChange={(e)=>setExYear(Number(e.target.value))}
              className="w-24 bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm"/>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportActivitiesCSV(exYear, exMonth)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-secondary">
            <Download className="h-4 w-4"/>Activités (CSV / Excel)
          </button>
          <button onClick={() => exportFinanceCSV(exYear, exMonth)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-secondary">
            <Download className="h-4 w-4"/>Finances (CSV / Excel)
          </button>
          <button onClick={printToPDF}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-secondary">
            <Printer className="h-4 w-4"/>Imprimer / PDF
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Les CSV s'ouvrent directement dans Excel, Google Sheets ou LibreOffice.
        </p>
      </Panel>

      <Panel title={<span className="inline-flex items-center gap-2"><Save className="h-4 w-4 text-primary"/>Sauvegarde & Restauration (multi-appareils)</span>}>
        <p className="text-xs text-muted-foreground mb-3">
          Exportez un fichier <code className="px-1 bg-secondary rounded">.json</code> contenant <strong>toutes vos données</strong>
          (activités, finances, paramètres). Importez-le ensuite sur un autre appareil pour retrouver exactement le même contenu.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={exportBackup}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="h-4 w-4"/>Exporter toutes mes données
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-secondary">
            <Upload className="h-4 w-4"/>Restaurer depuis un fichier
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const ok = confirm(
                importMode === "replace"
                  ? "Restaurer ce fichier ?\n\n⚠️ Toutes les données actuelles seront REMPLACÉES."
                  : "Fusionner ce fichier avec les données actuelles ?"
              );
              if (!ok) return;
              try {
                const { count } = await importBackup(f, importMode);
                toast.success("Restauration réussie", { description: `${count} éléments restaurés. Rechargement…` });
                setTimeout(() => window.location.reload(), 900);
              } catch (err) {
                toast.error("Échec de la restauration", { description: (err as Error).message });
              }
            }}/>
        </div>
        <Row label="Mode de restauration" hint={importMode === "replace" ? "Efface les données actuelles avant import." : "Conserve l'existant et ajoute/écrase les clés du fichier."}>
          <select value={importMode} onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
            className="bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm">
            <option value="replace">Remplacer tout</option>
            <option value="merge">Fusionner</option>
          </select>
        </Row>
        <div className="mt-3 p-3 rounded-md border border-border bg-secondary/30 text-[11px] text-muted-foreground">
          <strong className="text-foreground">Astuce multi-appareils :</strong> exportez depuis l'appareil source, envoyez-vous le fichier
          (e-mail, cloud, WhatsApp…), puis importez-le sur l'autre appareil. Pour une synchronisation automatique entre appareils, activez Lovable Cloud.
        </div>
      </Panel>

      <Panel title={<span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 text-destructive"/>Réinitialiser les données</span>}>
        <p className="text-xs text-muted-foreground mb-3">
          Videz les données du <strong>mois en cours</strong> pour repartir sur une saisie propre, ou effacez <strong>tout l'historique</strong>.
          Pensez à <em>exporter une sauvegarde</em> avant si vous voulez pouvoir les récupérer plus tard.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const d = new Date();
              const y = d.getFullYear(); const m = d.getMonth();
              if (!confirm(`Vider les activités ET les finances du mois en cours (${m + 1}/${y}) ?\nLes autres mois restent intacts.`)) return;
              const keys = [
                `mt.act.${y}-${m}`,
                `mt.fin.lines.${y}-${m}`,
                `mt.fin.goals.${y}-${m}`,
              ];
              keys.forEach((k) => localStorage.removeItem(k));
              toast.success("Mois en cours réinitialisé", { description: "Rechargement…" });
              setTimeout(() => window.location.reload(), 700);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10">
            <RefreshCw className="h-4 w-4"/>Vider le mois en cours
          </button>
          <button
            onClick={() => {
              if (!confirm("⚠️ EFFACER TOUTES LES DONNÉES Mind Tracker (activités, finances, roadmap, réglages) ?\nCette action est irréversible.")) return;
              if (!confirm("Confirmer définitivement la suppression complète ?")) return;
              const rm: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith("mt.")) rm.push(k);
              }
              rm.forEach((k) => localStorage.removeItem(k));
              toast.success("Toutes les données ont été effacées", { description: "Rechargement…" });
              setTimeout(() => window.location.reload(), 700);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive/20">
            <RefreshCw className="h-4 w-4"/>Tout effacer
          </button>
        </div>
      </Panel>
    </div>
  );
}
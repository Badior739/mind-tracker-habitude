import { useEffect, useState } from "react";
import { Panel } from "./ui";
import { useLocalStorage } from "@/lib/storage";
import { DEFAULT_APP_PREFS, DEFAULT_NOTIFS, type AppPrefs, type NotifPrefs } from "@/lib/prefs";
import { canNotify, requestNotifPermission, notify } from "@/lib/notifications";
import { toast } from "sonner";
import { clearPin, pinIsSet } from "@/lib/pin";
import { exportActivitiesCSV, exportFinanceCSV, printToPDF } from "@/lib/export";
import { Bell, Lock, EyeOff, Download, Printer, ShieldCheck, RotateCcw } from "lucide-react";

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
  const [perm, setPerm] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );
  const today = new Date();
  const [exYear, setExYear] = useState(today.getFullYear());
  const [exMonth, setExMonth] = useState(today.getMonth());

  useEffect(() => { setPerm(canNotify() ? "granted" : (("Notification" in window) ? Notification.permission : "denied")); }, [notifs.enabled]);

  async function toggleEnable(v: boolean) {
    if (v) {
      const p = await requestNotifPermission();
      setPerm(p);
      if (p === "granted") {
        setNotifs({ ...notifs, enabled: true });
        notify("Notifications activées", "Vous recevrez vos rappels Mind Tracker.");
      } else if (p === "denied") {
        toast.error("Notifications bloquées", { description: "Autorisez-les dans les réglages du navigateur pour ce site." });
      } else {
        toast("Permission refusée", { description: "Réessayez et acceptez la demande du navigateur." });
      }
    } else setNotifs({ ...notifs, enabled: false });
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
        {perm === "denied" && (
          <div className="mb-3 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-xs">
            Les notifications sont bloquées par le navigateur. Autorisez-les dans les réglages du site pour activer les rappels.
          </div>
        )}
        <Row label="Activer les notifications" hint="Autorise l'envoi de rappels depuis Mind Tracker">
          <Switch on={notifs.enabled && perm === "granted"} onChange={toggleEnable} />
        </Row>
        <Row label="Rappel quotidien des activités" hint="À l'heure choisie si toutes les activités ne sont pas cochées">
          <Switch on={notifs.dailyActivity} onChange={(v) => setNotifs({ ...notifs, dailyActivity: v })} />
        </Row>
        <Row label="Heure du rappel quotidien">
          <input type="time" value={notifs.dailyTime}
            onChange={(e) => setNotifs({ ...notifs, dailyTime: e.target.value })}
            className="bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm" />
        </Row>
        <Row label="Bilan financier hebdo" hint="Dimanche soir à partir de 19h">
          <Switch on={notifs.weeklyFinance} onChange={(v) => setNotifs({ ...notifs, weeklyFinance: v })} />
        </Row>
        <Row label="Alertes de dépassement budget" hint="Quand une dépense dépasse le budget prévu">
          <Switch on={notifs.budgetAlerts} onChange={(v) => setNotifs({ ...notifs, budgetAlerts: v })} />
        </Row>
        <Row label="Félicitations score élevé" hint="Notification quand vous atteignez 9/11 ou plus">
          <Switch on={notifs.scoreCongrats} onChange={(v) => setNotifs({ ...notifs, scoreCongrats: v })} />
        </Row>
        <div className="pt-3 flex gap-2 flex-wrap">
          <button onClick={async () => {
              if (!canNotify()) {
                const p = await requestNotifPermission();
                setPerm(p);
                if (p !== "granted") {
                  toast.error("Impossible d'envoyer une notification système", { description: "Affichage d'un message dans l'app à la place." });
                }
              }
              notify("Notification de test ✅", "Si vous lisez ceci, tout fonctionne !");
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-secondary">
            Tester une notification
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Astuce : pour recevoir les rappels même quand l'app est fermée sur mobile, ajoutez Mind Tracker à votre écran d'accueil (PWA).
        </p>
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
    </div>
  );
}
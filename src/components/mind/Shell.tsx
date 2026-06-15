import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarCheck, TrendingUp, Wallet, LineChart,
  Rocket, BookOpen, Brain, Menu, X, Settings as SettingsIcon, Lock, Eye, EyeOff
} from "lucide-react";
import { useLocalStorage } from "@/lib/storage";
import { DEFAULT_APP_PREFS, type AppPrefs } from "@/lib/prefs";

export type TabKey =
  | "dashboard"
  | "activities"
  | "annual"
  | "finances"
  | "history"
  | "roadmap"
  | "guide"
  | "settings";

const TABS: { key: TabKey; label: string; icon: typeof Brain; hint: string }[] = [
  { key: "dashboard",  label: "Tableau de bord",   icon: LayoutDashboard, hint: "Vue globale" },
  { key: "activities", label: "Activités du jour", icon: CalendarCheck,   hint: "Suivi quotidien" },
  { key: "annual",     label: "Synthèse annuelle", icon: TrendingUp,      hint: "Progression /11" },
  { key: "finances",   label: "Finances",          icon: Wallet,          hint: "Budget mensuel" },
  { key: "history",    label: "Historique",        icon: LineChart,       hint: "12 mois" },
  { key: "roadmap",    label: "Roadmap MGS",       icon: Rocket,          hint: "Vision stratégique" },
  { key: "guide",      label: "Guides",            icon: BookOpen,        hint: "Mode d'emploi" },
  { key: "settings",   label: "Paramètres",        icon: SettingsIcon,    hint: "PIN, rappels, exports" },
];

export function Shell({
  tab, onTab, children, onLock,
}: { tab: TabKey; onTab: (t: TabKey) => void; children: ReactNode; onLock: () => void }) {
  const [open, setOpen] = useState(false);
  const active = TABS.find((t) => t.key === tab)!;
  const [app, setApp] = useLocalStorage<AppPrefs>("mt.app.v1", DEFAULT_APP_PREFS);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-sidebar transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
            <div className="grid place-items-center h-11 w-11 rounded-xl"
                 style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Mind Tracker</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Mind Graphix Solution</div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = t.key === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => { onTab(t.key); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                    isActive
                      ? "bg-secondary text-foreground shadow-inner"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <span className={cn(
                    "grid place-items-center h-8 w-8 rounded-md transition-colors",
                    isActive ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground group-hover:text-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <div className="font-medium leading-none">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{t.hint}</div>
                  </div>
                </button>
              );
            })}
          </nav>
          <div className="px-6 py-4 border-t border-border text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Données stockées localement
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 lg:px-8 py-4">
            <button
              className="lg:hidden grid place-items-center h-10 w-10 rounded-lg border border-border"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{active.hint}</div>
              <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">{active.label}</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setApp({ ...app, discreet: !app.discreet })}
                title={app.discreet ? "Afficher les montants" : "Masquer les montants"}
                className="grid place-items-center h-10 w-10 rounded-lg border border-border hover:bg-secondary">
                {app.discreet ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={onLock} title="Verrouiller"
                className="grid place-items-center h-10 w-10 rounded-lg border border-border hover:bg-secondary">
                <Lock className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 lg:px-8 py-6 lg:py-10 max-w-[1400px]">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 bg-background/60 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
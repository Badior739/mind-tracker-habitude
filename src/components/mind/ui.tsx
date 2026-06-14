import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCard({
  label, value, sub, tone = "primary", icon,
}: { label: string; value: ReactNode; sub?: ReactNode; tone?: "primary"|"accent"|"success"|"warning"|"destructive"|"muted"; icon?: ReactNode }) {
  const toneRing = {
    primary: "ring-primary/30",
    accent: "ring-accent/30",
    success: "ring-[color:var(--success)]/40",
    warning: "ring-[color:var(--warning)]/40",
    destructive: "ring-destructive/40",
    muted: "ring-border",
  }[tone];
  const toneText = {
    primary: "text-primary",
    accent: "text-accent",
    success: "text-[color:var(--success)]",
    warning: "text-[color:var(--warning)]",
    destructive: "text-destructive",
    muted: "text-foreground",
  }[tone];
  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl border border-border p-5 ring-1", toneRing)}
      style={{ background: "var(--gradient-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && <div className={cn("opacity-80", toneText)}>{icon}</div>}
      </div>
      <div className={cn("mt-3 text-2xl lg:text-3xl font-semibold tracking-tight", toneText)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }:
  { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border", className)}
             style={{ background: "var(--gradient-card)" }}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <div>{action}</div>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function NumberInput({
  value, onChange, className, ...rest
}: { value: number; onChange: (v: number) => void; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value"|"onChange">) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value || 0))}
      className={cn(
        "w-full bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm text-right",
        "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition",
        className
      )}
      {...rest}
    />
  );
}

export function TextInput({
  value, onChange, className, ...rest
}: { value: string; onChange: (v: string) => void; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value"|"onChange">) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full bg-input/60 border border-border rounded-md px-2 py-1.5 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition",
        className
      )}
      {...rest}
    />
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cn(
        "h-7 w-7 grid place-items-center rounded-md border transition-all",
        on
          ? "bg-primary/15 border-primary/50 text-primary shadow-[0_0_15px_-3px_var(--primary)]"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
      aria-pressed={on}
    >
      {on ? "✓" : ""}
    </button>
  );
}

export function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary"|"accent"|"success"|"warning"|"destructive" }) {
  const v = Math.max(0, Math.min(100, value));
  const bg = {
    primary: "bg-primary",
    accent: "bg-accent",
    success: "bg-[color:var(--success)]",
    warning: "bg-[color:var(--warning)]",
    destructive: "bg-destructive",
  }[tone];
  return (
    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${v}%` }} />
    </div>
  );
}
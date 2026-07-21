import { useEffect, useRef, useState } from "react";
import { Brain, Delete, Lock } from "lucide-react";
import { bumpAttempts, getAttempts, pinIsSet, resetAttempts, setPin, verifyPin } from "@/lib/pin";

function PinPad({ value, onChange, max = 6 }: { value: string; onChange: (v: string) => void; max?: number }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
      {keys.map((k, i) => {
        if (k === "") return <div key={i} />;
        if (k === "del") return (
          <button key={i} onClick={() => onChange(value.slice(0, -1))}
            className="h-16 rounded-2xl border border-border bg-secondary/40 hover:bg-secondary text-foreground grid place-items-center">
            <Delete className="h-5 w-5" />
          </button>
        );
        return (
          <button key={i}
            onClick={() => { if (value.length < max) onChange(value + k); }}
            className="h-16 rounded-2xl border border-border bg-secondary/40 hover:bg-secondary text-2xl font-semibold">
            {k}
          </button>
        );
      })}
    </div>
  );
}

function Dots({ value, length = 6 }: { value: string; length?: number }) {
  return (
    <div className="flex justify-center gap-3 mb-6">
      {Array.from({ length }).map((_, i) => (
        <span key={i} className={`h-3.5 w-3.5 rounded-full border ${i < value.length ? "bg-primary border-primary shadow-[0_0_12px_var(--primary)]" : "border-border"}`} />
      ))}
    </div>
  );
}

export function PinLock({ onUnlock, mode = "auto" }: { onUnlock: () => void; mode?: "auto" | "setup" }) {
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<"setup1"|"setup2"|"verify">("setup1");
  const [pin, setPinValue] = useState("");
  const [first, setFirst] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const tick = useRef<number | null>(null);

  useEffect(() => {
    setStage(mode === "setup" || !pinIsSet() ? "setup1" : "verify");
    setAttempts(getAttempts());
    setPinValue("");
    setFirst("");
    setErr(null);
    setReady(true);
  }, [mode]);

  useEffect(() => {
    if (lockUntil > Date.now()) {
      tick.current = window.setInterval(() => {
        if (Date.now() >= lockUntil) { setLockUntil(0); setErr(null); }
      }, 500) as unknown as number;
      return () => { if (tick.current) clearInterval(tick.current); };
    }
  }, [lockUntil]);

  async function submit(v: string) {
    if (stage === "setup1") { setFirst(v); setPinValue(""); setStage("setup2"); return; }
    if (stage === "setup2") {
      if (v !== first) { setErr("Les codes ne correspondent pas."); setPinValue(""); setFirst(""); setStage("setup1"); return; }
      await setPin(v); onUnlock(); return;
    }
    const ok = await verifyPin(v);
    if (ok) { resetAttempts(); onUnlock(); return; }
    const n = bumpAttempts(); setAttempts(n); setPinValue(""); setErr("Code incorrect.");
    if (n >= 5) { setLockUntil(Date.now() + 30_000); setErr("Trop d'essais. Patientez 30 s."); }
  }

  useEffect(() => { if (pin.length === 6 && lockUntil < Date.now()) submit(pin); }, [pin]);

  const title = stage === "setup1" ? "Créer votre code PIN" : stage === "setup2" ? "Confirmez votre code PIN" : "Saisissez votre code PIN";
  const sub = stage === "verify"
    ? "6 chiffres pour déverrouiller Mind Tracker"
    : "Choisissez 6 chiffres faciles à mémoriser";
  const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));

  if (!ready) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto h-16 w-16 grid place-items-center rounded-2xl mb-4"
               style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <Lock className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Mind Tracker</h1>
          <p className="text-sm text-muted-foreground mt-2">Chargement sécurisé…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto h-16 w-16 grid place-items-center rounded-2xl mb-4"
             style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
          {stage === "verify" ? <Lock className="h-7 w-7 text-primary-foreground" /> : <Brain className="h-7 w-7 text-primary-foreground" />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Mind Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-8">{title}<br/><span className="text-xs">{sub}</span></p>
        <Dots value={pin} />
        {err && <div className="text-xs text-destructive mb-3">{err}{remaining > 0 ? ` (${remaining}s)` : ""}</div>}
        {attempts > 0 && stage === "verify" && !err && (
          <div className="text-xs text-muted-foreground mb-3">Essais : {attempts}/5</div>
        )}
        <div className="flex justify-center">
          <PinPad value={pin} onChange={(v) => { if (lockUntil < Date.now()) { setErr(null); setPinValue(v); } }} />
        </div>
      </div>
    </div>
  );
}
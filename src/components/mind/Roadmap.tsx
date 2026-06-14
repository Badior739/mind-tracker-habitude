import { DEFAULT_ROADMAP, type RoadmapItem } from "@/lib/mind-data";
import { useLocalStorage } from "@/lib/storage";
import { Panel, TextInput } from "./ui";
import { Check, Plus, Trash2 } from "lucide-react";

export function RoadmapView() {
  const [items, setItems] = useLocalStorage<RoadmapItem[]>("mt.roadmap", DEFAULT_ROADMAP);

  const upd = (i: number, patch: Partial<RoadmapItem>) =>
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const add = () => setItems([...items, { phase: "Nouvelle phase", period: "", objective: "", done: false }]);
  const del = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const doneCount = items.filter(i => i.done).length;

  return (
    <div className="space-y-6">
      <Panel
        title={<>Roadmap stratégique MGS — {doneCount}/{items.length} phases validées</>}
        action={
          <button onClick={add} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/15 text-primary border border-primary/30 text-xs hover:bg-primary/25 transition">
            <Plus className="h-3.5 w-3.5"/>Ajouter
          </button>
        }
      >
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4">
            {items.map((it, i) => (
              <div key={i} className="relative">
                <button
                  onClick={() => upd(i, { done: !it.done })}
                  className={`absolute -left-[22px] top-3 h-5 w-5 rounded-full border-2 grid place-items-center transition ${
                    it.done
                      ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_-2px_var(--primary)]"
                      : "border-border bg-card text-transparent hover:border-primary/60"
                  }`}
                  aria-label="Toggle done"
                >
                  <Check className="h-3 w-3" />
                </button>
                <div className="rounded-xl border border-border p-4" style={{ background: "var(--gradient-card)" }}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 items-start">
                    <div>
                      <TextInput value={it.phase} onChange={(v) => upd(i, { phase: v })} className="font-semibold !text-base bg-transparent border-transparent focus:!bg-input/60" />
                      <TextInput value={it.objective} onChange={(v) => upd(i, { objective: v })} placeholder="Objectif…" className="mt-2 text-muted-foreground" />
                    </div>
                    <TextInput value={it.period} onChange={(v) => upd(i, { period: v })} placeholder="Période" />
                    <button onClick={() => del(i)} className="grid place-items-center h-9 w-9 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
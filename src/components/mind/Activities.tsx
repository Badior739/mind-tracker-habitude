import { useMemo } from "react";
import { ACTIVITIES, MONTHS, daysInMonth, dayLabel, type DayEntry } from "@/lib/mind-data";
import { useLocalStorage } from "@/lib/storage";
import { Panel, TextInput, Toggle, ProgressBar } from "./ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MonthData = Record<number, DayEntry>;

export function ActivitiesView() {
  const today = new Date();
  const [year, setYear] = useLocalStorage("mt.act.year", today.getFullYear());
  const [month, setMonth] = useLocalStorage("mt.act.month", today.getMonth());
  const key = `mt.act.${year}-${month}`;
  const [data, setData] = useLocalStorage<MonthData>(key, {});

  const dim = daysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: dim }, (_, i) => i + 1), [dim]);

  const setDay = (d: number, patch: Partial<DayEntry>) =>
    setData({ ...data, [d]: { ...(data[d] || {}), ...patch } });

  const scores = days.map((d) => {
    const e = data[d] || {};
    return ACTIVITIES.reduce((s, a) => s + (e[a.key] ? 1 : 0), 0);
  });
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const possible = dim * ACTIVITIES.length;
  const avg = totalScore / dim;
  const pctAvg = (totalScore / possible) * 100;

  const shift = (n: number) => {
    let m = month + n, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  return (
    <div className="space-y-6">
      <Panel
        title={
          <div className="flex items-center gap-3">
            <button onClick={() => shift(-1)} className="grid place-items-center h-8 w-8 rounded-md border border-border hover:bg-secondary"><ChevronLeft className="h-4 w-4"/></button>
            <span className="text-base">{MONTHS[month]} {year}</span>
            <button onClick={() => shift(1)} className="grid place-items-center h-8 w-8 rounded-md border border-border hover:bg-secondary"><ChevronRight className="h-4 w-4"/></button>
          </div>
        }
        action={
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <div>Score moyen : <span className="text-primary font-semibold">{avg.toFixed(2)}/11</span></div>
            <div>Réussite : <span className="text-accent font-semibold">{pctAvg.toFixed(1)}%</span></div>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr className="text-muted-foreground">
                <th className="sticky left-0 bg-card text-left font-medium py-2 pr-2 min-w-[110px] z-10">📅 Jour</th>
                <th className="font-medium py-2 px-2 min-w-[70px]">⏰ Réveil</th>
                {ACTIVITIES.map((a) => (
                  <th key={a.key} className="font-medium py-2 px-1 text-center min-w-[44px]" title={a.label}>
                    <div className="text-base leading-none">{a.emoji}</div>
                    <div className="text-[10px] mt-1 text-muted-foreground">{a.label.split(" ")[0]}</div>
                  </th>
                ))}
                <th className="font-medium py-2 px-2 text-center">⭐ /11</th>
                <th className="font-medium py-2 px-2 text-center">📊 %</th>
                <th className="font-medium py-2 px-2 min-w-[180px]">📝 Notes</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => {
                const e = data[d] || {};
                const score = scores[i];
                const p = (score / ACTIVITIES.length) * 100;
                return (
                  <tr key={d} className="border-t border-border">
                    <td className="sticky left-0 bg-card py-1.5 pr-2 font-medium text-foreground z-10">
                      {dayLabel(year, month, d)}
                    </td>
                    <td className="py-1.5 px-1">
                      <TextInput value={e.reveil || ""} onChange={(v) => setDay(d, { reveil: v })} placeholder="06:30" className="text-center" />
                    </td>
                    {ACTIVITIES.map((a) => (
                      <td key={a.key} className="py-1.5 px-1 text-center">
                        <div className="flex justify-center">
                          <Toggle on={!!e[a.key]} onChange={(v) => setDay(d, { [a.key]: v } as Partial<DayEntry>)} />
                        </div>
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-center font-semibold text-primary">{score}</td>
                    <td className="py-1.5 px-2 text-center w-[90px]">
                      <div className="text-[11px] text-muted-foreground mb-1">{p.toFixed(0)}%</div>
                      <ProgressBar value={p} tone={p >= 75 ? "success" : p >= 50 ? "primary" : p >= 25 ? "warning" : "destructive"} />
                    </td>
                    <td className="py-1.5 px-1">
                      <TextInput value={e.notes || ""} onChange={(v) => setDay(d, { notes: v })} placeholder="…" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
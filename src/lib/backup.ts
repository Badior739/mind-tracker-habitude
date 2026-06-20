import { toast } from "sonner";

const PREFIX = "mt.";
const VERSION = 1;

export type BackupFile = {
  app: "mind-tracker";
  version: number;
  exportedAt: string;
  device?: string;
  data: Record<string, unknown>;
};

/** Collecte toutes les clés mt.* du localStorage. */
export function collectBackup(): BackupFile {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    const raw = localStorage.getItem(k);
    if (raw == null) continue;
    try { data[k] = JSON.parse(raw); } catch { data[k] = raw; }
  }
  return {
    app: "mind-tracker",
    version: VERSION,
    exportedAt: new Date().toISOString(),
    device: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    data,
  };
}

/** Télécharge un fichier JSON contenant toutes les données. */
export function exportBackup() {
  const file = collectBackup();
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `mind-tracker_sauvegarde_${stamp}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Sauvegarde téléchargée", { description: "Conservez ce fichier en lieu sûr." });
}

/** Restaure depuis un fichier JSON. mode 'merge' garde l'existant, 'replace' efface d'abord. */
export async function importBackup(file: File, mode: "merge" | "replace" = "replace"): Promise<{ count: number }> {
  const text = await file.text();
  let parsed: BackupFile;
  try { parsed = JSON.parse(text) as BackupFile; }
  catch { throw new Error("Fichier illisible (JSON invalide)."); }
  if (!parsed || parsed.app !== "mind-tracker" || !parsed.data) {
    throw new Error("Ce n'est pas une sauvegarde Mind Tracker valide.");
  }
  if (mode === "replace") {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }
  let count = 0;
  for (const [k, v] of Object.entries(parsed.data)) {
    if (!k.startsWith(PREFIX)) continue;
    try {
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
      count++;
    } catch {}
  }
  return { count };
}
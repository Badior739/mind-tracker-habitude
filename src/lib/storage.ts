import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

export const fmtCFA = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " F";

export const pct = (n: number, digits = 1) =>
  `${(n * 100).toFixed(digits)}%`;

/** Masque les montants si le mode discret est actif. */
export const fmtCFAMasked = (n: number, discreet: boolean) =>
  discreet ? "••••• F" : fmtCFA(n);
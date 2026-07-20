import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const read = (k: string): T => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  };
  // On garde la clé associée à la valeur dans l'état, pour éviter d'écrire
  // l'ancienne valeur sous une nouvelle clé lors d'un changement (ex. mois).
  const [state, setState] = useState<{ k: string; v: T }>(() => ({ k: key, v: read(key) }));
  if (state.k !== key) {
    setState({ k: key, v: read(key) });
  }
  useEffect(() => {
    if (state.k !== key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state.v));
    } catch {}
  }, [key, state]);
  const setValue = useCallback((v: T | ((prev: T) => T)) => {
    setState((s) => ({ k: s.k, v: typeof v === "function" ? (v as (p: T) => T)(s.v) : v }));
  }, []);
  return [state.v, setValue] as const;
}

export const fmtCFA = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " F";

export const pct = (n: number, digits = 1) =>
  `${(n * 100).toFixed(digits)}%`;

/** Masque les montants si le mode discret est actif. */
export const fmtCFAMasked = (n: number, discreet: boolean) =>
  discreet ? "••••• F" : fmtCFA(n);
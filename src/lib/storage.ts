import { useEffect, useRef, useState } from "react";

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
  const [value, setValue] = useState<T>(() => read(key));
  const prevKey = useRef(key);
  // Quand la clé change (ex. changement de mois), on relit depuis le storage
  // au lieu de réécrire l'ancienne valeur sous la nouvelle clé.
  if (prevKey.current !== key) {
    prevKey.current = key;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // setValue pendant le render : React planifie un re-render immédiat avec la nouvelle valeur.
    setValue(read(key));
  }
  useEffect(() => {
    if (prevKey.current !== key) return; // évite d'écrire avant la relecture
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
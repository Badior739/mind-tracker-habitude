// PIN 6 chiffres : stockage du hash + sel. Jamais le PIN en clair.

const PIN_KEY = "mt.pin.v1";
const ATTEMPTS_KEY = "mt.pin.attempts";

type Stored = { salt: string; hash: string };

async function sha256(s: string) {
  const buf = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function pinIsSet() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(PIN_KEY);
}

export async function setPin(pin: string) {
  const salt = randomSalt();
  const hash = await sha256(salt + ":" + pin);
  const data: Stored = { salt, hash };
  localStorage.setItem(PIN_KEY, JSON.stringify(data));
  localStorage.removeItem(ATTEMPTS_KEY);
}

export async function verifyPin(pin: string) {
  const raw = localStorage.getItem(PIN_KEY);
  if (!raw) return false;
  const { salt, hash } = JSON.parse(raw) as Stored;
  const candidate = await sha256(salt + ":" + pin);
  return candidate === hash;
}

export function clearPin() {
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(ATTEMPTS_KEY);
}

export function getAttempts() {
  return Number(localStorage.getItem(ATTEMPTS_KEY) || "0");
}
export function bumpAttempts() {
  const n = getAttempts() + 1;
  localStorage.setItem(ATTEMPTS_KEY, String(n));
  return n;
}
export function resetAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
}
import { p256 } from "@noble/curves/nist.js";
import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

type PushKeys = { publicKey: string; privateKey: string; subject: string };

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function getPushKeys(): PushKeys {
  const privateKey = process.env["VAPID_SERVER_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"];
  if (!privateKey || !subject) throw new Error("La configuration des notifications push est incomplète.");
  // La clé publique est toujours dérivée de la clé privée : une valeur configurée
  // désynchronisée provoque « point is not on curve » côté navigateur.
  const publicKey = encodeBase64Url(p256.getPublicKey(decodeBase64Url(privateKey), false));
  return { privateKey, publicKey, subject };
}

export async function hashInstallationSecret(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  notification: { title: string; body: string; tag: string },
) {
  const keys = getPushKeys();
  const target: PushSubscription = {
    endpoint: subscription.endpoint,
    expirationTime: null,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };
  const payload = await buildPushPayload(
    {
      data: JSON.stringify({ ...notification, url: "/" }),
      options: { ttl: 300, urgency: "high", topic: notification.tag },
    },
    target,
    keys,
  );
  return fetch(target.endpoint, payload as unknown as RequestInit);
}
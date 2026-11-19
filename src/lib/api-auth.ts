import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { clientIp } from "@/lib/auth";
import { db } from "@/lib/db";
import { ipAllowed } from "@/lib/ip-list";
import { createThrottle } from "@/lib/throttle";

const KEY_PREFIX = "pf_";

/** A new API key. Only the hash is stored; the key itself is shown to the admin once. */
export function generateApiKey() {
  const key = KEY_PREFIX + randomBytes(32).toString("base64url");
  return { key, hash: hashApiKey(key), prefix: key.slice(0, KEY_PREFIX.length + 6) };
}

// The key has 256 bits of entropy, so a plain sha256 is enough (no slow hash needed), the same
// reasoning as for session tokens in auth.ts. Lookup is by hash, so there is no string comparison
// of the secret to time.
export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

// Failed keys per IP: guessing is hopeless anyway, but this keeps the logs and the DB quiet.
const failures = createThrottle(20, 15 * 60 * 1000);
// Requests per key, so a leaked or looping client can't hammer the site.
const requests = createThrottle(120, 60 * 1000);

export type ApiCaller = { id: number; name: string; ip: string };
export type ApiAuthResult = { ok: true; caller: ApiCaller } | { ok: false; status: number; error: string };

export async function authenticateApi(headers: { get(name: string): string | null }, now = Date.now()): Promise<ApiAuthResult> {
  const ip = clientIp(headers);
  if (failures.isThrottled(ip, now)) return { ok: false, status: 429, error: "For mange mislykkede forsøk. Prøv igjen om en stund." };

  const auth = headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1];
  if (!token || !token.startsWith(KEY_PREFIX)) {
    failures.hit(ip, now);
    return { ok: false, status: 401, error: "Mangler eller ugyldig API-nøkkel (Authorization: Bearer pf_...)" };
  }

  const key = await db.apiKey.findUnique({ where: { hash: hashApiKey(token) } });
  if (!key || key.revokedAt) {
    failures.hit(ip, now);
    return { ok: false, status: 401, error: "Ugyldig eller tilbaketrukket API-nøkkel" };
  }

  // With a whitelist, an unknown client IP (proxy not sending X-Real-IP) fails closed.
  if (key.allowedIps.length > 0 && (ip === "unknown" || !ipAllowed(ip, key.allowedIps))) {
    return { ok: false, status: 403, error: `IP-adressen ${ip} har ikke tilgang med denne nøkkelen` };
  }

  if (!requests.reserve(`key:${key.id}`, now)) return { ok: false, status: 429, error: "For mange forespørsler. Vent litt." };

  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date(now), lastUsedIp: ip } });
  return { ok: true, caller: { id: key.id, name: key.name, ip } };
}

import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createThrottle } from "@/lib/throttle";

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id: hash(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The logged-in admin, or null. Expired sessions are deleted on read. Cached per request. */
export const getAdmin = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: hash(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
});

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
  jar.delete(SESSION_COOKIE);
}

/**
 * Client IP for the login throttle. Never trust the first X-Forwarded-For entry: the client
 * controls it, and nginx's $proxy_add_x_forwarded_for only appends the real address at the end.
 * Prefer X-Real-IP (nginx sets it to $remote_addr), otherwise the last X-Forwarded-For entry.
 */
export function clientIp(h: { get(name: string): string | null }) {
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  warnMissingRealIp();
  const last = h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last || "unknown";
}

// Without X-Real-IP from the proxy, the throttle key is weaker (or shared by everyone as "unknown").
// Say so once in production, so a misconfigured nginx shows up in the logs.
let warnedRealIp = false;
function warnMissingRealIp() {
  if (warnedRealIp || process.env.NODE_ENV !== "production") return;
  warnedRealIp = true;
  console.warn("[auth] X-Real-IP mangler på innloggingsforespørsel. Sett `proxy_set_header X-Real-IP $remote_addr;` i nginx, ellers er innloggingsgrensen svakere.");
}

// Login throttle: 5 failed attempts per key per 15 minutes.
const loginThrottle = createThrottle(5, 15 * 60 * 1000);

export const isThrottled = loginThrottle.isThrottled;
export const recordFailure = loginThrottle.hit;
export const clearFailures = loginThrottle.clear;

/**
 * Checks the limit and counts the attempt in one synchronous step, before any await. Counting only
 * after the slow bcrypt compare would let parallel requests all pass the check while the count is 0.
 * Returns false when the key is throttled. Call clearFailures on a successful login.
 */
export const reserveAttempt = loginThrottle.reserve;
